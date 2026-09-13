/**
 * Error taxonomy for the Money Manager MCP server.
 *
 * Handlers and the HTTP client throw these subclasses; FastMCP catches them and
 * surfaces them to the client as native MCP tool results with `isError: true`.
 * The `category` / `retryable` metadata drives logging and retry decisions
 * internally; the client-facing payload is the error message.
 */

/** Error categories, used for logging and retry logic. */
export enum ErrorCategory {
  NETWORK = "NETWORK",
  API = "API",
  SESSION = "SESSION",
  FILE = "FILE",
  INTERNAL = "INTERNAL",
}

/** Base class for all Money Manager errors. */
export class McpError extends Error {
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;

  constructor(
    category: ErrorCategory,
    message: string,
    retryable = false,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "McpError";
    this.category = category;
    this.retryable = retryable;
  }
}

/** Network-related errors (connection failures, timeouts). Retryable by default. */
export class NetworkError extends McpError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    retryable = true,
  ) {
    super(ErrorCategory.NETWORK, message, retryable, details);
    this.name = "NetworkError";
  }

  static timeout(url: string, timeoutMs: number, hint?: string): NetworkError {
    return new NetworkError(
      `Request to ${url} timed out after ${timeoutMs}ms`,
      {
        url,
        timeoutMs,
        errorType: "TIMEOUT",
        hint,
      },
    );
  }

  /**
   * Timeout error with a hint specific to transaction_list: the Money Manager
   * server has a known bug where it hangs on date ranges with no transactions.
   * Marked non-retryable — the hang never clears on retry, so each attempt
   * would just burn another full timeout before the client sees the hint.
   */
  static timeoutForTransactionList(
    url: string,
    timeoutMs: number,
  ): NetworkError {
    return new NetworkError(
      `Request to ${url} timed out after ${timeoutMs}ms`,
      {
        url,
        timeoutMs,
        errorType: "TIMEOUT",
        hint:
          "The Money Manager server may hang when querying date ranges with no transactions. " +
          "This is a known server-side limitation. Try a date range that has recorded transactions.",
      },
      false,
    );
  }

  static connectionRefused(url: string): NetworkError {
    return new NetworkError(`Connection refused to ${url}`, {
      url,
      errorType: "CONNECTION_REFUSED",
    });
  }

  static unreachable(url: string, originalError?: string): NetworkError {
    return new NetworkError(
      `Cannot connect to Money Manager server at ${url}`,
      {
        url,
        originalError,
        errorType: "UNREACHABLE",
      },
    );
  }
}

/** API errors (server returned an error HTTP response). Retryable on 5xx. */
export class APIError extends McpError {
  public readonly statusCode?: number;

  constructor(
    message: string,
    statusCode?: number,
    details?: Record<string, unknown>,
  ) {
    const retryable = statusCode !== undefined && statusCode >= 500;
    super(ErrorCategory.API, message, retryable, { ...details, statusCode });
    this.name = "APIError";
    this.statusCode = statusCode;
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
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCategory.SESSION, message, false, details);
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
  constructor(
    message: string,
    public readonly filePath?: string,
    details?: Record<string, unknown>,
  ) {
    super(ErrorCategory.FILE, message, false, { ...details, filePath });
    this.name = "FileError";
  }

  static writeFailed(filePath: string, originalError?: string): FileError {
    return new FileError(`Cannot write file to '${filePath}'`, filePath, {
      originalError,
      operation: "write",
    });
  }
}

/** Type guard: is the value an McpError? */
export function isMcpError(error: unknown): error is McpError {
  return error instanceof McpError;
}

/**
 * Normalizes an unknown error into an McpError.
 * - McpError instances pass through unchanged.
 * - Common network error codes map to NetworkError.
 * - Anything else becomes an internal error.
 */
export function wrapError(error: unknown): McpError {
  if (isMcpError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (code === "ECONNREFUSED") {
      return NetworkError.connectionRefused("unknown");
    }
    if (code === "ETIMEDOUT" || code === "ECONNABORTED") {
      return NetworkError.timeout("unknown", 0);
    }
    if (code === "ENOTFOUND") {
      return NetworkError.unreachable("unknown", error.message);
    }
    return new McpError(
      ErrorCategory.INTERNAL,
      "An unexpected error occurred",
      false,
      { originalError: error.message, stack: error.stack },
    );
  }

  return new McpError(ErrorCategory.INTERNAL, String(error));
}
