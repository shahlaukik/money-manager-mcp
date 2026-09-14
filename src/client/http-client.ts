import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { randomUUID } from "node:crypto";
import { CookieJar } from "tough-cookie";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseStringPromise } from "xml2js";

import type { Config } from "../config/index.js";
import {
  NetworkError,
  APIError,
  FileError,
  SessionError,
  wrapError,
  type McpError,
} from "../errors/index.js";
import { resolvesInsideWorkingDirectory } from "../schemas/index.js";
import { isIdentPart, isIdentStart, isWhitespaceChar } from "./identifiers.js";

/**
 * Cap on response body size (25 MiB). Excel exports are a few MB at most;
 * anything larger from the phone server is suspect.
 */
const MAX_RESPONSE_BYTES = 25 * 1024 * 1024;

/**
 * Serializes one form-data value. Tool inputs are zod-validated primitives
 * (strings/numbers/booleans), which pass through unchanged; a structured
 * value serializes as JSON rather than collapsing to "[object Object]".
 */
function toFormValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  // JSON.stringify only returns undefined for symbols/functions, which never
  // occur in tool inputs.
  return JSON.stringify(value);
}

/**
 * HTTP client with cookie/session management for the Money Manager API.
 *
 * The upstream API has two unusual response formats that this client handles:
 *  - JavaScript object literals (single quotes, unquoted keys) for most calls
 *  - XML for transaction lists
 */
export class HttpClient {
  /** Axios instance; created in initialize() once the session jar is final. */
  private client!: AxiosInstance;
  private cookieJar: CookieJar;
  /** Last persisted cookie state — lets saves skip no-op disk writes. */
  private lastSavedCookies: string | undefined;
  /** Serializes cookie writes so queued async saves cannot interleave. */
  private cookieSaveChain: Promise<void> = Promise.resolve();
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
    this.cookieJar = new CookieJar();
  }

  /**
   * Restores the persisted session (if enabled) and creates the axios
   * instance bound to the final cookie jar. Must complete before the first
   * request; `createHttpClient` takes care of awaiting it.
   */
  async initialize(): Promise<void> {
    if (this.config.session?.persist) {
      await this.loadCookies();
    }

    this.client = wrapper(
      axios.create({
        baseURL: `${this.config.server.baseUrl}/moneyBook`,
        timeout: this.config.server.timeout,
        jar: this.cookieJar,
        maxContentLength: MAX_RESPONSE_BYTES,
        maxBodyLength: MAX_RESPONSE_BYTES,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json, text/xml, */*",
        },
      }),
    );

    this.client.interceptors.request.use(
      (req) => {
        this.log("debug", `Request: ${req.method?.toUpperCase()} ${req.url}`);
        return req;
      },
      (error: unknown) => {
        this.log("error", "Request error:", error);
        return Promise.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      },
    );

    this.client.interceptors.response.use(
      (response) => {
        this.log(
          "debug",
          `Response: ${response.status} ${response.statusText}`,
        );
        if (this.config.session?.persist) {
          this.saveCookies();
        }
        return response;
      },
      async (error: unknown) => this.handleResponseError(error),
    );
  }

  // ---------------------------------------------------------------- GET / POST

  /**
   * GET request. The API returns JavaScript object-literal syntax (not valid
   * JSON), so the response is parsed accordingly.
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    return this.getText(endpoint, params, (body) =>
      this.parseJsLiteralResponse<T>(body),
    );
  }

  /** GET request expecting an XML response (transaction list). */
  async getXml<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    return this.getText(
      endpoint,
      params,
      (body) => this.parseXmlResponse<T>(body),
      "text/xml",
    );
  }

  /**
   * Shared GET plumbing: an idempotent (retryable) text request with
   * undefined params stripped; the caller picks the body parser.
   */
  private async getText<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> | undefined,
    parse: (body: string) => T | Promise<T>,
    accept?: string,
  ): Promise<T> {
    const response = await this.executeWithRetry<string>(
      () =>
        this.client.get<string>(endpoint, {
          params: this.filterUndefined(params),
          responseType: "text",
          headers: accept ? { Accept: accept } : undefined,
        }),
      true,
    );
    return parse(response.data);
  }

  /**
   * POST request with URL-encoded form data. The API returns JavaScript
   * object-literal syntax (not valid JSON), so the response is parsed accordingly.
   */
  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.executeWithRetry<string>(() =>
      this.client.post<string>(endpoint, this.toFormData(data), {
        responseType: "text",
      }),
    );
    return this.parseJsLiteralResponse<T>(response.data);
  }

  /** POST request that downloads a binary file (Excel export). */
  async downloadFile(
    endpoint: string,
    outputPath: string,
    data?: Record<string, unknown>,
  ): Promise<{ filePath: string; fileSize: number }> {
    const response = await this.executeWithRetry<ArrayBuffer>(() =>
      this.client.post<ArrayBuffer>(endpoint, this.toFormData(data), {
        responseType: "arraybuffer",
      }),
    );

    // Re-run the containment guard as late as possible: schema validation
    // happened before the network call, and the filesystem may have changed
    // while it was in flight (e.g. a symlink planted under the working
    // directory). Fails closed on any lookup error.
    if (!resolvesInsideWorkingDirectory(outputPath)) {
      throw new FileError(
        `Refusing to write export outside the working directory: ${outputPath}`,
      );
    }

    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Write to a fresh exclusive temp file next to the target, then rename it
    // into place. "wx" never follows or overwrites anything pre-existing, and
    // rename replaces a symlink at `outputPath` instead of following it, so a
    // link planted between the guard and the write cannot redirect the export
    // outside the working directory. 0600: exports carry financial data.
    const tmpPath = path.join(
      dir,
      `.${path.basename(outputPath)}.${randomUUID()}.tmp`,
    );
    try {
      await fs.writeFile(tmpPath, Buffer.from(response.data), {
        flag: "wx",
        mode: 0o600,
      });
      await fs.rename(tmpPath, outputPath);
    } catch (error) {
      void fs.rm(tmpPath, { force: true }).catch(() => {});
      throw error;
    }
    const { size } = await fs.stat(outputPath);
    return { filePath: outputPath, fileSize: size };
  }

  // ------------------------------------------------------------- retry / errors

  /**
   * Executes a request with exponential-backoff retry on retryable errors.
   *
   * Only idempotent requests (reads) opt into retry: a timed-out POST may have
   * already been applied by the server before the error surfaced, and retrying
   * it would duplicate a financial write. Writes therefore run single-shot.
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    idempotent = false,
  ): Promise<AxiosResponse<T>> {
    const maxRetries = idempotent ? this.config.server.retryCount : 0;
    let lastError: McpError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        const mcpError = wrapError(error);
        lastError = mcpError;

        if (!mcpError.retryable || attempt >= maxRetries) {
          throw mcpError;
        }

        const delay = this.config.server.retryDelay * Math.pow(2, attempt);
        this.log(
          "warn",
          `Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new NetworkError("Request failed after all retries");
  }

  /** Maps axios errors to the appropriate McpError subclass. */
  private handleResponseError(error: unknown): Promise<never> {
    if (axios.isAxiosError(error)) {
      const axiosError = error;

      // Network errors (no response received)
      if (!axiosError.response) {
        if (axiosError.code === "ECONNREFUSED") {
          throw NetworkError.connectionRefused(this.config.server.baseUrl);
        }
        if (
          axiosError.code === "ETIMEDOUT" ||
          axiosError.code === "ECONNABORTED"
        ) {
          const url = axiosError.config?.url ?? "unknown";
          // The Money Manager server has a known bug where it hangs on empty
          // date ranges; give a more helpful message for transaction_list.
          if (url.includes("/getDataByPeriod")) {
            throw NetworkError.timeoutForTransactionList(
              url,
              this.config.server.timeout,
            );
          }
          throw NetworkError.timeout(url, this.config.server.timeout);
        }
        if (axiosError.code === "ENOTFOUND") {
          throw NetworkError.unreachable(
            this.config.server.baseUrl,
            axiosError.message,
          );
        }
        throw new NetworkError(axiosError.message);
      }

      const status = axiosError.response.status;
      if (status === 401 || status === 403) {
        throw SessionError.unauthorized();
      }
      throw APIError.fromStatusCode(status, axiosError.message);
    }

    throw wrapError(error);
  }

  // ----------------------------------------------------------- response parsing

  /** Parses an XML response into a typed object. */
  private async parseXmlResponse<T>(xmlString: string): Promise<T> {
    if (!xmlString || xmlString.trim() === "") {
      return {} as T;
    }
    try {
      const result: unknown = await parseStringPromise(xmlString, {
        explicitArray: false,
        ignoreAttrs: true,
        trim: true,
      });
      return (result ?? {}) as T;
    } catch (error) {
      throw new APIError(`Failed to parse XML response: ${String(error)}`);
    }
  }

  /**
   * Parses a JavaScript object-literal response into an object.
   *
   * The Money Manager API returns JS literal syntax (single quotes, unquoted
   * property names) instead of valid JSON. We try JSON.parse first, then
   * convert the literal to JSON via a non-evaluating tokenizer. Parsing never
   * falls back to `eval`/`new Function`: response text is only ever parsed as
   * data, so it cannot trigger code execution even if a server is malicious
   * or compromised.
   */
  private parseJsLiteralResponse<T>(responseText: string): T {
    if (!responseText || responseText.trim() === "") {
      return {} as T;
    }

    try {
      return JSON.parse(responseText) as T;
    } catch {
      try {
        return JSON.parse(this.convertJsLiteralToJson(responseText)) as T;
      } catch (conversionError) {
        // Log size only — the body can contain financial data.
        this.log(
          "error",
          `Failed to parse response body (${responseText.length} chars)`,
        );
        throw new APIError(
          `Failed to parse API response: ${String(conversionError)}`,
        );
      }
    }
  }

  /**
   * Converts JavaScript object-literal syntax to valid JSON by tokenizing the
   * input in a single string-aware pass: single-quoted strings are re-emitted
   * as double-quoted JSON strings, and unquoted property names are quoted.
   *
   * Unlike a regex pass, this respects string boundaries (so quotes or colons
   * inside string values are left alone) and — importantly — it never
   * evaluates the input. Malformed input throws rather than reaching an
   * `eval`/`new Function` fallback, so untrusted response text cannot execute.
   */
  private convertJsLiteralToJson(jsLiteral: string): string {
    const out: string[] = [];
    let i = 0;
    const n = jsLiteral.length;

    while (i < n) {
      const ch = jsLiteral[i]!;

      // String literal (single- or double-quoted).
      if (ch === "'" || ch === '"') {
        const quote = ch;
        let body = "";
        i++; // consume opening quote
        while (i < n) {
          const c = jsLiteral[i]!;
          if (c === "\\") {
            const next = jsLiteral[i + 1];
            if (next === "'") {
              // \' is valid in JS but not JSON — normalize to a plain quote.
              body += "'";
              i += 2;
            } else {
              // Preserve other escapes (\n, \t, \\, \", \uXXXX, …) verbatim;
              // they are valid in JSON string bodies.
              body += "\\" + (next ?? "");
              i += 2;
            }
            continue;
          }
          if (c === quote) {
            i++; // consume closing quote
            break;
          }
          body += c;
          i++;
        }
        // Re-serialize as a valid JSON string (handles quoting/escaping).
        out.push(JSON.stringify(body));
        continue;
      }

      // Identifier outside a string: a property key or a bare keyword.
      if (isIdentStart(ch)) {
        let ident = ch;
        i++;
        while (i < n && isIdentPart(jsLiteral[i])) {
          ident += jsLiteral[i];
          i++;
        }
        // Look ahead past whitespace to see whether this is a key.
        let j = i;
        while (j < n && isWhitespaceChar(jsLiteral[j]!)) j++;
        if (jsLiteral[j] === ":") {
          out.push(JSON.stringify(ident));
        } else {
          // Bare value (true/false/null). Passed through verbatim; JSON.parse
          // rejects anything else rather than the input being evaluated.
          out.push(ident);
        }
        continue;
      }

      // Numbers, punctuation, and whitespace pass through unchanged.
      out.push(ch);
      i++;
    }

    return out.join("");
  }

  // ----------------------------------------------------------------- utilities

  /** URL-encodes an object, skipping undefined/null values. */
  private toFormData(data?: Record<string, unknown>): string {
    if (!data) return "";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        params.append(key, toFormValue(value));
      }
    }
    return params.toString();
  }

  /** Strips undefined values from a params object. */
  private filterUndefined(
    params?: Record<string, string | number | undefined>,
  ): Record<string, string | number> | undefined {
    if (!params) return undefined;
    const filtered: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }

  // ----------------------------------------------------------- cookie persistence

  /** Path of the persisted cookie file. */
  private getCookiePath(): string {
    return path.resolve(
      process.cwd(),
      this.config.session?.cookieFile ?? ".session-cookies.json",
    );
  }

  /**
   * Loads cookies from the persisted file, if present. Runs before the axios
   * instance is created, so the deserialized jar can simply replace the empty
   * one axios would otherwise bind.
   */
  private async loadCookies(): Promise<void> {
    const cookiePath = this.getCookiePath();
    try {
      const cookies: unknown = JSON.parse(
        await fs.readFile(cookiePath, "utf-8"),
      );
      if (cookies && typeof cookies === "object") {
        this.cookieJar = CookieJar.deserializeSync(
          cookies as CookieJar.Serialized,
        );
        this.lastSavedCookies = JSON.stringify(
          this.cookieJar.serializeSync(),
          null,
          2,
        );
      }
    } catch (error) {
      // A missing file is the normal first-run case.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        this.log("warn", `Failed to load cookies from ${cookiePath}:`, error);
      }
    }
  }

  /**
   * Persists cookies to disk, queued so async writes cannot interleave.
   * Unchanged state is skipped. A write still pending at process exit is
   * simply lost — the client re-authenticates on the next start.
   */
  private saveCookies(): void {
    this.cookieSaveChain = this.cookieSaveChain
      .then(() => this.writeCookiesIfChanged())
      .catch((error: unknown) => {
        this.log(
          "warn",
          `Failed to save cookies to ${this.getCookiePath()}:`,
          error,
        );
      });
  }

  private async writeCookiesIfChanged(): Promise<void> {
    const cookiePath = this.getCookiePath();
    const serialized = JSON.stringify(this.cookieJar.serializeSync(), null, 2);
    if (serialized === this.lastSavedCookies) return;
    try {
      // 0600: live session cookies must not be group/world readable. `mode`
      // only applies at file creation, so chmod also tightens files written
      // before this hardening.
      await fs.writeFile(cookiePath, serialized, { mode: 0o600 });
      try {
        await fs.chmod(cookiePath, 0o600);
      } catch {
        // Filesystems without chmod support (e.g. some Windows shares) are fine.
      }
      this.lastSavedCookies = serialized;
    } catch (error) {
      this.lastSavedCookies = undefined; // retry on the next response
      throw error; // logged by the saveCookies chain
    }
  }

  // -------------------------------------------------------------------- logging

  /**
   * Logs a message if its level is at or above the configured level.
   * Uses console.error (stderr) so the MCP stdio channel on stdout stays clean.
   */
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    ...args: unknown[]
  ): void {
    const levels = ["debug", "info", "warn", "error"];
    const configLevel = this.config.logging?.level ?? "info";
    if (levels.indexOf(level) < levels.indexOf(configLevel)) return;

    const timestamp = new Date().toISOString();
    if (this.config.logging?.format === "json") {
      console.error(
        JSON.stringify({
          timestamp,
          level,
          message,
          args: args.length > 0 ? args : undefined,
        }),
      );
    } else {
      console.error(
        `[${timestamp}] [${level.toUpperCase()}]`,
        message,
        ...args,
      );
    }
  }
}

/** Creates a new HTTP client, restoring any persisted session. */
export async function createHttpClient(config: Config): Promise<HttpClient> {
  const client = new HttpClient(config);
  await client.initialize();
  return client;
}
