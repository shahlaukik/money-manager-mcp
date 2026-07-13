import axios, { type AxiosInstance, type AxiosError, type AxiosResponse } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import * as fs from "fs";
import * as path from "path";
import { parseStringPromise } from "xml2js";

import type { Config } from "../config/index.js";
import {
  NetworkError,
  APIError,
  SessionError,
  wrapError,
  type McpError,
} from "../errors/index.js";

/**
 * HTTP client with cookie/session management for the Money Manager API.
 *
 * The upstream API has two unusual response formats that this client handles:
 *  - JavaScript object literals (single quotes, unquoted keys) for most calls
 *  - XML for transaction lists
 */
export class HttpClient {
  private readonly client: AxiosInstance;
  private cookieJar: CookieJar;
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
    this.cookieJar = new CookieJar();

    if (config.session?.persist) {
      this.loadCookies();
    }

    this.client = wrapper(
      axios.create({
        baseURL: `${config.server.baseUrl}/moneyBook`,
        timeout: config.server.timeout,
        jar: this.cookieJar,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json, text/xml, */*",
        },
        withCredentials: true,
      }),
    );

    this.client.interceptors.request.use(
      (req) => {
        this.log("debug", `Request: ${req.method?.toUpperCase()} ${req.url}`);
        return req;
      },
      (error: unknown) => {
        this.log("error", "Request error:", error);
        return Promise.reject(error);
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
    const response = await this.executeWithRetry<string>(() =>
      this.client.get<string>(endpoint, {
        params: this.filterUndefined(params),
        responseType: "text",
      }),
    );
    return this.parseJsLiteralResponse<T>(response.data);
  }

  /** GET request expecting an XML response (transaction list). */
  async getXml<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const response = await this.executeWithRetry<string>(() =>
      this.client.get<string>(endpoint, {
        params: this.filterUndefined(params),
        responseType: "text",
        headers: { Accept: "text/xml" },
      }),
    );
    return this.parseXmlResponse<T>(response.data);
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

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    return { filePath: outputPath, fileSize: fs.statSync(outputPath).size };
  }

  // ------------------------------------------------------------- retry / errors

  /** Executes a request with exponential-backoff retry on retryable errors. */
  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
  ): Promise<AxiosResponse<T>> {
    const maxRetries = this.config.server.retryCount;
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
      const axiosError = error as AxiosError;

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
        throw new NetworkError(axiosError.message, { code: axiosError.code });
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
      const result = await parseStringPromise(xmlString, {
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
   * convert the literal to JSON, then — as a last resort — evaluate the
   * literal. The eval fallback is safe here: this is only data from our known
   * local-network API, never user input.
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
        try {
          // Wrap in parentheses to make it an expression.
          return new Function(`return (${responseText});`)() as T;
        } catch {
          this.log(
            "error",
            "Failed to parse response:",
            responseText.substring(0, 200),
          );
          throw new APIError(
            `Failed to parse API response: ${String(conversionError)}`,
          );
        }
      }
    }
  }

  /**
   * Converts JavaScript object-literal syntax to valid JSON:
   * single quotes -> double quotes, unquoted keys -> quoted keys.
   */
  private convertJsLiteralToJson(jsLiteral: string): string {
    let result = jsLiteral;

    // Single quotes -> double quotes (works for this API's format).
    result = result.replace(/'/g, '"');

    // Quote unquoted property names after { , or [ .
    result = result.replace(
      /([{,[\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
      '$1"$2":',
    );

    // Clean up double-double quotes that the above may have created.
    result = result.replace(/""/g, '"');

    return result;
  }

  // ----------------------------------------------------------------- utilities

  /** URL-encodes an object, skipping undefined/null values. */
  private toFormData(data?: Record<string, unknown>): string {
    if (!data) return "";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
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

  /** Loads cookies from the persisted file, if present. */
  private loadCookies(): void {
    const cookiePath = this.getCookiePath();
    if (!fs.existsSync(cookiePath)) return;
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));
      if (cookies && typeof cookies === "object") {
        this.cookieJar = CookieJar.deserializeSync(cookies);
      }
    } catch (error) {
      this.log("warn", `Failed to load cookies from ${cookiePath}:`, error);
    }
  }

  /** Persists cookies to disk. */
  private saveCookies(): void {
    const cookiePath = this.getCookiePath();
    try {
      const serialized = this.cookieJar.serializeSync();
      fs.writeFileSync(cookiePath, JSON.stringify(serialized, null, 2));
    } catch (error) {
      this.log("warn", `Failed to save cookies to ${cookiePath}:`, error);
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
      console.error(`[${timestamp}] [${level.toUpperCase()}]`, message, ...args);
    }
  }
}

/** Creates a new HTTP client instance. */
export function createHttpClient(config: Config): HttpClient {
  return new HttpClient(config);
}
