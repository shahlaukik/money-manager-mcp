import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { config as dotenvConfig } from "dotenv";

// Load environment variables from .env file
dotenvConfig();

/**
 * Configuration validation schema using Zod
 */
export const ConfigSchema = z.object({
  server: z.object({
    baseUrl: z.string().url(),
    timeout: z.number().min(1000).max(120000).default(30000),
    retryCount: z.number().min(0).max(10).default(3),
    retryDelay: z.number().min(100).max(10000).default(1000),
  }),
  session: z
    .object({
      persist: z.boolean().default(true),
      cookieFile: z.string().default(".session-cookies.json"),
    })
    .optional(),
  logging: z
    .object({
      level: z.enum(["debug", "info", "warn", "error"]).default("info"),
      format: z.enum(["json", "text"]).default("json"),
    })
    .optional(),
  defaults: z
    .object({
      mbid: z.string().optional(),
      dateFormat: z.string().default("YYYY-MM-DD"),
    })
    .optional(),
});

/**
 * Configuration type inferred from the schema
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<Config> = {
  server: {
    baseUrl: "http://192.168.1.1:8888",
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000,
  },
  session: {
    persist: true,
    cookieFile: ".session-cookies.json",
  },
  logging: {
    level: "info",
    format: "json",
  },
  defaults: {
    dateFormat: "YYYY-MM-DD",
  },
};

/**
 * Configuration file name
 */
const CONFIG_FILE_NAME = ".money-manager-mcp.json";

/**
 * Loads configuration from a JSON file if it exists
 */
function loadConfigFile(): Partial<Config> {
  const configPath = path.resolve(process.cwd(), CONFIG_FILE_NAME);

  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(fileContent) as Partial<Config>;
    } catch (error) {
      console.warn(
        `Warning: Failed to parse config file at ${configPath}:`,
        error,
      );
      return {};
    }
  }

  return {};
}

/**
 * Loads configuration from environment variables
 */
function loadEnvConfig(): Partial<Config> {
  const envConfig: Partial<Config> = {};

  // Server configuration from environment
  if (process.env["MONEY_MANAGER_BASE_URL"]) {
    envConfig.server = {
      ...envConfig.server,
      baseUrl: process.env["MONEY_MANAGER_BASE_URL"],
      timeout: DEFAULT_CONFIG.server?.timeout ?? 30000,
      retryCount: DEFAULT_CONFIG.server?.retryCount ?? 3,
      retryDelay: DEFAULT_CONFIG.server?.retryDelay ?? 1000,
    };
  }

  if (process.env["MONEY_MANAGER_TIMEOUT"]) {
    envConfig.server = {
      ...envConfig.server,
      baseUrl:
        envConfig.server?.baseUrl ??
        DEFAULT_CONFIG.server?.baseUrl ??
        "http://192.168.1.100:8888",
      timeout: parseInt(process.env["MONEY_MANAGER_TIMEOUT"], 10),
      retryCount: DEFAULT_CONFIG.server?.retryCount ?? 3,
      retryDelay: DEFAULT_CONFIG.server?.retryDelay ?? 1000,
    };
  }

  if (process.env["MONEY_MANAGER_RETRY_COUNT"]) {
    envConfig.server = {
      ...envConfig.server,
      baseUrl:
        envConfig.server?.baseUrl ??
        DEFAULT_CONFIG.server?.baseUrl ??
        "http://192.168.1.100:8888",
      timeout:
        envConfig.server?.timeout ?? DEFAULT_CONFIG.server?.timeout ?? 30000,
      retryCount: parseInt(process.env["MONEY_MANAGER_RETRY_COUNT"], 10),
      retryDelay: DEFAULT_CONFIG.server?.retryDelay ?? 1000,
    };
  }

  // Logging configuration from environment
  if (process.env["MONEY_MANAGER_LOG_LEVEL"]) {
    const level = process.env["MONEY_MANAGER_LOG_LEVEL"] as
      | "debug"
      | "info"
      | "warn"
      | "error";
    envConfig.logging = {
      ...envConfig.logging,
      level,
      format: DEFAULT_CONFIG.logging?.format ?? "json",
    };
  }

  // Session configuration from environment
  if (process.env["MONEY_MANAGER_SESSION_PERSIST"]) {
    envConfig.session = {
      ...envConfig.session,
      persist: process.env["MONEY_MANAGER_SESSION_PERSIST"] === "true",
      cookieFile: DEFAULT_CONFIG.session?.cookieFile ?? ".session-cookies.json",
    };
  }

  return envConfig;
}

/**
 * Deep merges configuration objects
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        ) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Cached configuration instance
 */
let cachedConfig: Config | null = null;

/**
 * Loads and validates the complete configuration
 *
 * Configuration sources (in order of priority, highest first):
 * 1. Environment variables
 * 2. Configuration file (.money-manager-mcp.json)
 * 3. Default values
 */
export async function loadConfig(): Promise<Config> {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Load from different sources
  const fileConfig = loadConfigFile();
  const envConfig = loadEnvConfig();

  // Merge configurations (env > file > defaults)
  const mergedConfig = deepMerge(
    deepMerge(DEFAULT_CONFIG as Config, fileConfig as Config),
    envConfig as Config,
  );

  // Validate the merged configuration
  const validationResult = ConfigSchema.safeParse(mergedConfig);

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new Error(`Configuration validation failed: ${errorMessages}`);
  }

  // Freeze the configuration to make it immutable
  cachedConfig = Object.freeze(validationResult.data) as Config;

  return cachedConfig;
}

/**
 * Gets the current configuration synchronously
 * Throws if configuration has not been loaded yet
 */
export function getConfig(): Config {
  if (!cachedConfig) {
    throw new Error("Configuration not loaded. Call loadConfig() first.");
  }
  return cachedConfig;
}

/**
 * Resets the cached configuration (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

/**
 * Creates a sample configuration file
 */
export function createSampleConfigFile(outputPath?: string): void {
  const sampleConfig = {
    server: {
      baseUrl: "http://your-server-ip:port",
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
    },
    session: {
      persist: true,
      cookieFile: ".session-cookies.json",
    },
    logging: {
      level: "info",
      format: "json",
    },
    defaults: {
      mbid: "default",
      dateFormat: "YYYY-MM-DD",
    },
  };

  const filePath = outputPath ?? path.resolve(process.cwd(), CONFIG_FILE_NAME);
  fs.writeFileSync(filePath, JSON.stringify(sampleConfig, null, 2));
}
