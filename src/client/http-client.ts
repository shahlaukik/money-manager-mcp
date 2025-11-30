import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
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
 * HTTP client with cookie/session management for Money Manager API
 */
export class HttpClient {
  private client: AxiosInstance;
  private cookieJar: CookieJar;
  private config: Config;
  private retryCount: number;

  constructor(config: Config) {
    this.config = config;
    this.retryCount = 0;

    // Initialize cookie jar for session management
    this.cookieJar = new CookieJar();

    // Load persisted cookies if enabled
    if (config.session?.persist) {
      this.loadCookies();
    }

    // Create axios instance with cookie jar support
    const axiosInstance = axios.create({
      baseURL: `${config.server.baseUrl}/moneyBook`,
      timeout: config.server.timeout,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json, text/xml, */*",
      },
      withCredentials: true,
    });

    // Wrap axios with cookie jar support
    this.client = wrapper(axiosInstance);

    // Set the cookie jar on the instance
    (this.client.defaults as { jar?: CookieJar }).jar = this.cookieJar;

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (requestConfig) => {
        this.log(
          "debug",
          `Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`,
        );
        return requestConfig;
      },
      (error: unknown) => {
        this.log("error", "Request error:", error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        this.log(
          "debug",
          `Response: ${response.status} ${response.statusText}`,
        );
        // Persist cookies after successful response
        if (this.config.session?.persist) {
          this.saveCookies();
        }
        return response;
      },
      async (error: unknown) => {
        return this.handleResponseError(error);
      },
    );
  }

  /**
   * Makes a GET request
   * Note: The API returns JavaScript object literal syntax (not valid JSON),
   * so we need to parse it accordingly.
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const filteredParams = this.filterUndefinedParams(params);
    const response = await this.executeWithRetry<string>(() =>
      this.client.get<string>(endpoint, {
        params: filteredParams,
        responseType: "text",
      }),
    );
    return this.parseJsLiteralResponse<T>(response.data);
  }

  /**
   * Makes a GET request expecting XML response
   */
  async getXml<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const filteredParams = this.filterUndefinedParams(params);
    const response = await this.executeWithRetry<string>(() =>
      this.client.get<string>(endpoint, {
        params: filteredParams,
        responseType: "text",
        headers: {
          Accept: "text/xml",
        },
      }),
    );
    return this.parseXmlResponse<T>(response.data);
  }

  /**
   * Makes a POST request with form data
   * Note: The API returns JavaScript object literal syntax (not valid JSON),
   * so we need to parse it accordingly.
   */
  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    const formData = this.toFormData(data);
    const response = await this.executeWithRetry<string>(() =>
      this.client.post<string>(endpoint, formData, {
        responseType: "text",
      }),
    );
    return this.parseJsLiteralResponse<T>(response.data);
  }

  /**
   * Makes a POST request and downloads a file
   */
  async downloadFile(
    endpoint: string,
    outputPath: string,
    data?: Record<string, unknown>,
  ): Promise<{ filePath: string; fileSize: number }> {
    const formData = this.toFormData(data);
    const response = await this.executeWithRetry<ArrayBuffer>(() =>
      this.client.post<ArrayBuffer>(endpoint, formData, {
        responseType: "arraybuffer",
      }),
    );

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    const stats = fs.statSync(outputPath);

    return {
      filePath: outputPath,
      fileSize: stats.size,
    };
  }

  /**
   * Downloads a file via GET request
   */
  async downloadFileGet(
    endpoint: string,
    outputPath: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<{ filePath: string; fileSize: number }> {
    const filteredParams = this.filterUndefinedParams(params);
    const response = await this.executeWithRetry<ArrayBuffer>(() =>
      this.client.get<ArrayBuffer>(endpoint, {
        params: filteredParams,
        responseType: "arraybuffer",
      }),
    );

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    const stats = fs.statSync(outputPath);

    return {
      filePath: outputPath,
      fileSize: stats.size,
    };
  }

  /**
   * Uploads a file via multipart form data
   */
  async uploadFile<T>(
    endpoint: string,
    filePath: string,
    fieldName: string = "file",
  ): Promise<T> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const FormData = (await import("form-data")).default;
    const formData = new FormData();
    formData.append(fieldName, fs.createReadStream(filePath));

    const response = await this.executeWithRetry<T>(() =>
      this.client.post<T>(endpoint, formData, {
        headers: formData.getHeaders(),
      }),
    );

    return response.data;
  }

  /**
   * Clears the session cookies
   */
  clearSession(): void {
    this.cookieJar = new CookieJar();
    if (this.config.session?.persist) {
      const cookiePath = this.getCookiePath();
      if (fs.existsSync(cookiePath)) {
        fs.unlinkSync(cookiePath);
      }
    }
  }

  /**
   * Executes a request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
  ): Promise<AxiosResponse<T>> {
    const maxRetries = this.config.server.retryCount;
    let lastError: McpError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.retryCount = attempt;
        return await requestFn();
      } catch (error) {
        const mcpError = wrapError(error);
        lastError = mcpError;

        // Only retry if the error is retryable and we haven't exhausted retries
        if (!mcpError.retryable || attempt >= maxRetries) {
          throw mcpError;
        }

        // Wait before retrying with exponential backoff
        const delay = this.config.server.retryDelay * Math.pow(2, attempt);
        this.log(
          "warn",
          `Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await this.sleep(delay);
      }
    }

    throw lastError ?? new NetworkError("Request failed after all retries");
  }

  /**
   * Handles response errors and converts them to appropriate MCP errors
   */
  private handleResponseError(error: unknown): Promise<never> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network errors (no response)
      if (!axiosError.response) {
        if (axiosError.code === "ECONNREFUSED") {
          throw NetworkError.connectionRefused(this.config.server.baseUrl);
        }
        if (
          axiosError.code === "ETIMEDOUT" ||
          axiosError.code === "ECONNABORTED"
        ) {
          const url = axiosError.config?.url ?? "unknown";

          // Check if this is a transaction list request - provide a more helpful error message
          // because the Money Manager server has a known bug where it hangs on empty date ranges
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

      // HTTP errors
      const status = axiosError.response.status;

      // Session errors
      if (status === 401 || status === 403) {
        throw SessionError.unauthorized();
      }

      // Other HTTP errors
      throw APIError.fromStatusCode(status, axiosError.message);
    }

    throw wrapError(error);
  }

  /**
   * Parses XML response to JavaScript object
   */
  private async parseXmlResponse<T>(xmlString: string): Promise<T> {
    // Handle empty or whitespace-only responses
    if (!xmlString || xmlString.trim() === "") {
      return {} as T;
    }

    try {
      const result = await parseStringPromise(xmlString, {
        explicitArray: false,
        ignoreAttrs: true,
        trim: true,
      });

      // Handle case where result is null/undefined
      if (result === null || result === undefined) {
        return {} as T;
      }

      return result as T;
    } catch (error) {
      throw new APIError(`Failed to parse XML response: ${String(error)}`);
    }
  }

  /**
   * Parses JavaScript object literal response to JavaScript object
   * The Money Manager API returns responses in JS literal syntax (single quotes,
   * unquoted property names) instead of valid JSON.
   */
  private parseJsLiteralResponse<T>(responseText: string): T {
    if (!responseText || responseText.trim() === "") {
      return {} as T;
    }

    try {
      // First, try standard JSON parse (in case response is valid JSON)
      return JSON.parse(responseText) as T;
    } catch {
      // If standard JSON parse fails, convert JS literal to valid JSON
      try {
        const jsonString = this.convertJsLiteralToJson(responseText);
        return JSON.parse(jsonString) as T;
      } catch (conversionError) {
        // As a fallback, try using Function constructor to evaluate the JS literal
        // This is safe because we're only evaluating data from our known API
        try {
          // Wrap in parentheses to make it an expression
          const fn = new Function(`return (${responseText});`);
          return fn() as T;
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
   * Converts JavaScript object literal syntax to valid JSON
   * Handles: single quotes → double quotes, unquoted keys → quoted keys
   */
  private convertJsLiteralToJson(jsLiteral: string): string {
    let result = jsLiteral;

    // Step 1: Replace single quotes with double quotes
    // But be careful not to replace single quotes inside strings
    // Simple approach: replace all single quotes (works for this API's format)
    result = result.replace(/'/g, '"');

    // Step 2: Add quotes around unquoted property names
    // Match property names that are not already quoted
    // Pattern: start of object/array or comma, followed by identifier and colon
    result = result.replace(
      /([{,\[])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, // eslint-disable-line no-useless-escape
      '$1"$2":',
    );

    // Step 3: Handle property names at the start of the string (for nested objects)
    result = result.replace(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm, '"$1":');

    // Step 4: Clean up any double-double quotes that might have been created
    result = result.replace(/""/g, '"');

    return result;
  }

  /**
   * Converts an object to URL-encoded form data
   */
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

  /**
   * Filters out undefined values from params object
   */
  private filterUndefinedParams(
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

  /**
   * Gets the path for persisted cookies
   */
  private getCookiePath(): string {
    return path.resolve(
      process.cwd(),
      this.config.session?.cookieFile ?? ".session-cookies.json",
    );
  }

  /**
   * Loads cookies from persisted file
   */
  private loadCookies(): void {
    const cookiePath = this.getCookiePath();
    if (fs.existsSync(cookiePath)) {
      try {
        const cookieData = fs.readFileSync(cookiePath, "utf-8");
        const cookies = JSON.parse(cookieData);
        if (cookies && typeof cookies === "object") {
          this.cookieJar = CookieJar.deserializeSync(cookies);
        }
      } catch (error) {
        this.log("warn", `Failed to load cookies from ${cookiePath}:`, error);
      }
    }
  }

  /**
   * Saves cookies to persisted file
   */
  private saveCookies(): void {
    const cookiePath = this.getCookiePath();
    try {
      const serialized = this.cookieJar.serializeSync();
      fs.writeFileSync(cookiePath, JSON.stringify(serialized, null, 2));
    } catch (error) {
      this.log("warn", `Failed to save cookies to ${cookiePath}:`, error);
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Logs a message based on configured log level
   * Note: Uses console.error to avoid corrupting MCP stdio transport
   */
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    ...args: unknown[]
  ): void {
    const configLevel = this.config.logging?.level ?? "info";
    const levels = ["debug", "info", "warn", "error"];
    const configLevelIndex = levels.indexOf(configLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex >= configLevelIndex) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

      // Use console.error (stderr) instead of console.log (stdout)
      // because MCP uses stdout for JSON-RPC communication
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
        console.error(prefix, message, ...args);
      }
    }
  }
}

/**
 * Creates a new HTTP client instance
 */
export function createHttpClient(config: Config): HttpClient {
  return new HttpClient(config);
}
