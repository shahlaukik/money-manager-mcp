/**
 * Error categories for the Money Manager MCP server
 */
export enum ErrorCategory {
  NETWORK = "NETWORK",
  API = "API",
  VALIDATION = "VALIDATION",
  SESSION = "SESSION",
  FILE = "FILE",
  INTERNAL = "INTERNAL",
}

/**
 * Base error interface for MCP errors
 */
export interface McpErrorDetails {
  code: string;
  category: ErrorCategory;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

/**
 * Base class for all Money Manager MCP errors
 */
export class McpError extends Error implements McpErrorDetails {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    code: string,
    category: ErrorCategory,
    message: string,
    retryable: boolean = false,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.category = category;
    this.retryable = retryable;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    const ErrorWithCapture = Error as typeof Error & {
      captureStackTrace?: (
        targetObject: object,
        constructorOpt?: (...args: unknown[]) => unknown,
      ) => void;
    };
    if (ErrorWithCapture.captureStackTrace) {
      ErrorWithCapture.captureStackTrace(this, McpError);
    }
  }

  /**
   * Converts the error to a JSON-serializable object
   */
  toJSON(): McpErrorDetails {
    return {
      code: this.code,
      category: this.category,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
    };
  }
}

/**
 * Network-related errors (connection failures, timeouts)
 */
export class NetworkError extends McpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("NETWORK_ERROR", ErrorCategory.NETWORK, message, true, details);
    this.name = "NetworkError";
  }

  static timeout(url: string, timeoutMs: number, hint?: string): NetworkError {
    const message = `Request to ${url} timed out after ${timeoutMs}ms`;
    return new NetworkError(message, {
      url,
      timeoutMs,
      errorType: "TIMEOUT",
      hint,
    });
  }

  /**
   * Creates a timeout error with a specific hint for transaction_list queries
   */
  static timeoutForTransactionList(
    url: string,
    timeoutMs: number,
  ): NetworkError {
    return NetworkError.timeout(
      url,
      timeoutMs,
      "Note: The Money Manager server may hang when querying date ranges with no transactions. " +
        "This is a known server-side limitation. Try a date range that has recorded transactions.",
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

/**
 * API-related errors (server returned an error response)
 */
export class APIError extends McpError {
  public readonly statusCode?: number;

  constructor(
    message: string,
    statusCode?: number,
    details?: Record<string, unknown>,
  ) {
    const retryable = statusCode !== undefined && statusCode >= 500;
    super("API_ERROR", ErrorCategory.API, message, retryable, {
      ...details,
      statusCode,
    });
    this.name = "APIError";
    this.statusCode = statusCode;
  }

  static notFound(resource: string, id?: string): APIError {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    return new APIError(message, 404, { resource, id });
  }

  static serverError(message: string, statusCode: number = 500): APIError {
    return new APIError(`Server error: ${message}`, statusCode);
  }

  static badRequest(message: string): APIError {
    return new APIError(`Bad request: ${message}`, 400);
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

    const errorMessage =
      message ?? defaultMessages[statusCode] ?? "Unknown Error";
    return new APIError(errorMessage, statusCode);
  }
}

/**
 * Validation errors (input validation failures)
 */
export class ValidationError extends McpError {
  public readonly field?: string;
  public readonly expected?: string;
  public readonly received?: unknown;

  constructor(
    message: string,
    field?: string,
    expected?: string,
    received?: unknown,
  ) {
    super("VALIDATION_ERROR", ErrorCategory.VALIDATION, message, false, {
      field,
      expected,
      received,
    });
    this.name = "ValidationError";
    this.field = field;
    this.expected = expected;
    this.received = received;
  }

  static invalidField(
    field: string,
    expected: string,
    received: unknown,
  ): ValidationError {
    return new ValidationError(
      `Invalid value for '${field}': expected ${expected}, received ${JSON.stringify(received)}`,
      field,
      expected,
      received,
    );
  }

  static requiredField(field: string): ValidationError {
    return new ValidationError(
      `Required field '${field}' is missing`,
      field,
      "required",
      undefined,
    );
  }

  static invalidFormat(
    field: string,
    format: string,
    value: string,
  ): ValidationError {
    return new ValidationError(
      `Invalid format for '${field}': expected ${format}`,
      field,
      format,
      value,
    );
  }

  static fromZodError(zodError: {
    errors: Array<{ path: (string | number)[]; message: string }>;
  }): ValidationError {
    const firstError = zodError.errors[0];
    if (!firstError) {
      return new ValidationError("Validation failed");
    }
    const field = firstError.path.join(".");
    return new ValidationError(
      `Validation failed for '${field}': ${firstError.message}`,
      field,
    );
  }
}

/**
 * Session-related errors (authentication issues)
 */
export class SessionError extends McpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("SESSION_ERROR", ErrorCategory.SESSION, message, true, details);
    this.name = "SessionError";
  }

  static expired(): SessionError {
    return new SessionError("Session has expired. Please reconnect.");
  }

  static invalid(): SessionError {
    return new SessionError("Invalid session. Please reconnect.");
  }

  static unauthorized(): SessionError {
    return new SessionError(
      "Unauthorized access. Please check your credentials.",
    );
  }
}

/**
 * File system errors (backup/export operations)
 */
export class FileError extends McpError {
  public readonly filePath?: string;

  constructor(
    message: string,
    filePath?: string,
    details?: Record<string, unknown>,
  ) {
    super("FILE_ERROR", ErrorCategory.FILE, message, false, {
      ...details,
      filePath,
    });
    this.name = "FileError";
    this.filePath = filePath;
  }

  static readFailed(filePath: string, originalError?: string): FileError {
    return new FileError(`Cannot read file at '${filePath}'`, filePath, {
      originalError,
      operation: "read",
    });
  }

  static writeFailed(filePath: string, originalError?: string): FileError {
    return new FileError(`Cannot write file to '${filePath}'`, filePath, {
      originalError,
      operation: "write",
    });
  }

  static notFound(filePath: string): FileError {
    return new FileError(`File not found: '${filePath}'`, filePath, {
      operation: "access",
    });
  }

  static permissionDenied(filePath: string): FileError {
    return new FileError(
      `Permission denied for file: '${filePath}'`,
      filePath,
      {
        operation: "access",
      },
    );
  }
}

/**
 * Internal errors (unexpected errors)
 */
export class InternalError extends McpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("INTERNAL_ERROR", ErrorCategory.INTERNAL, message, false, details);
    this.name = "InternalError";
  }

  static unexpected(originalError?: Error): InternalError {
    return new InternalError(
      "An unexpected error occurred",
      originalError
        ? {
            originalError: originalError.message,
            stack: originalError.stack,
          }
        : undefined,
    );
  }

  static notImplemented(feature: string): InternalError {
    return new InternalError(`Feature '${feature}' is not implemented`, {
      feature,
    });
  }
}

/**
 * Type guard to check if an error is an McpError
 */
export function isMcpError(error: unknown): error is McpError {
  return error instanceof McpError;
}

/**
 * Wraps an unknown error into an appropriate McpError
 */
export function wrapError(error: unknown): McpError {
  if (isMcpError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common network error codes
    const errorWithCode = error as Error & { code?: string };
    if (errorWithCode.code === "ECONNREFUSED") {
      return NetworkError.connectionRefused("unknown");
    }
    if (
      errorWithCode.code === "ETIMEDOUT" ||
      errorWithCode.code === "ECONNABORTED"
    ) {
      return NetworkError.timeout("unknown", 0);
    }
    if (errorWithCode.code === "ENOTFOUND") {
      return NetworkError.unreachable("unknown", error.message);
    }

    return InternalError.unexpected(error);
  }

  return new InternalError(String(error));
}
