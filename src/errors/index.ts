/**
 * Error taxonomy for the Money Manager MCP server.
 *
 * Handlers and the HTTP client throw these subclasses; FastMCP catches them and
 * surfaces them to the client as native MCP tool results with `isError: true`.
 * The message is the only client-facing payload — anything the client should
 * see (guidance, causes) must be part of it. The `retryable` flag drives the
 * HTTP client's retry decisions.
 */

/** Base class for all Money Manager errors. */
export class McpError extends Error {
  public readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = "McpError";
    this.retryable = retryable;
  }
}

/** Network-related errors (connection failures, timeouts). Retryable by default. */
export class NetworkError extends McpError {
  constructor(message: string, retryable = true) {
    super(message, retryable);
    this.name = "NetworkError";
  }

  static timeout(url: string, timeoutMs: number): NetworkError {
    return new NetworkError(`Request to ${url} timed out after ${timeoutMs}ms`);
  }

  /**
   * Timeout error with a message specific to transaction_list: the Money Manager
   * server has a known bug where it hangs on date ranges with no transactions,
   * so the guidance is folded into the message the client actually sees.
   * Marked non-retryable — the hang never clears on retry, so each attempt
   * would just burn another full timeout before the client sees the hint.
   */
  static timeoutForTransactionList(
    url: string,
    timeoutMs: number,
  ): NetworkError {
    return new NetworkError(
      `Request to ${url} timed out after ${timeoutMs}ms. The Money Manager ` +
        "server may hang when querying date ranges with no transactions — " +
        "try a date range that has recorded transactions.",
      false,
    );
  }

  static connectionRefused(url: string): NetworkError {
    return new NetworkError(`Connection refused to ${url}`);
  }

  static unreachable(url: string, originalError?: string): NetworkError {
    return new NetworkError(
      originalError
        ? `Cannot connect to Money Manager server at ${url} (${originalError})`
        : `Cannot connect to Money Manager server at ${url}`,
    );
  }
}

/** API errors (server returned an error HTTP response). Retryable on 5xx. */
export class APIError extends McpError {
  constructor(message: string, statusCode?: number) {
    const retryable = statusCode !== undefined && statusCode >= 500;
    super(message, retryable);
    this.name = "APIError";
  }

  static fromStatusCode(statusCode: number, message?: string): APIError {
    const defaultMessages: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      500: "Internal Server Error",
      502: "Bad Gateway",
      503: "Service Unavailable",
    };
    return new APIError(
      message ?? defaultMessages[statusCode] ?? "Unknown Error",
      statusCode,
    );
  }
}

/**
 * Session errors (authentication / authorization). Not retryable — resending
 * the same request with the same session cookies cannot fix a 401/403.
 */
export class SessionError extends McpError {
  constructor(message: string) {
    super(message, false);
    this.name = "SessionError";
  }

  static unauthorized(): SessionError {
    return new SessionError(
      "Unauthorized access. Please check your credentials.",
    );
  }
}

/** File system errors (export operations). Not retryable. */
export class FileError extends McpError {
  constructor(message: string) {
    super(message, false);
    this.name = "FileError";
  }

  static writeFailed(filePath: string, originalError: string): FileError {
    return new FileError(
      `Cannot write file to '${filePath}': ${originalError}`,
    );
  }
}

/** Type guard: is the value an McpError? */
export function isMcpError(error: unknown): error is McpError {
  return error instanceof McpError;
}

/**
 * Normalizes an unknown error into an McpError.
 * - McpError instances pass through unchanged.
 * - Errors carrying a network errno become retryable NetworkErrors. Axios
 *   errors are already mapped by the response interceptor before they reach
 *   this; the errno check covers raw Node errors that bypassed axios.
 * - Anything else becomes a non-retryable internal error whose message
 *   includes the original cause (the message is all a client ever sees).
 */
export function wrapError(error: unknown): McpError {
  if (isMcpError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ECONNABORTED" ||
      code === "ENOTFOUND"
    ) {
      return new NetworkError(error.message);
    }
    return new McpError(`An unexpected error occurred: ${error.message}`);
  }

  return new McpError(String(error));
}
