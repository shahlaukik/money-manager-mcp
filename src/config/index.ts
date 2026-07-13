import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { config as dotenvConfig } from "dotenv";

// Load environment variables from a .env file, if present.
dotenvConfig();

/**
 * Configuration schema. Defaults are declared here so the schema itself is the
 * single source of truth — callers only need to set `baseUrl` (and optionally
 * override anything else).
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
    .default({}),
  logging: z
    .object({
      level: z.enum(["debug", "info", "warn", "error"]).default("info"),
      format: z.enum(["json", "text"]).default("json"),
    })
    .default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

/** Name of the optional JSON config file (read from the working directory). */
const CONFIG_FILE = ".money-manager-mcp.json";

/**
 * Loads configuration. Priority (highest first):
 *   1. CLI override (`--baseUrl`), if provided
 *   2. Environment variables
 *   3. `.money-manager-mcp.json` in the working directory
 *   4. Schema defaults
 */
export async function loadConfig(
  overrides: { baseUrl?: string } = {},
): Promise<Config> {
  const fileConfig = loadConfigFile();
  const envConfig = loadEnvConfig();
  const cliConfig = overrides.baseUrl
    ? { server: { baseUrl: overrides.baseUrl } }
    : {};

  // Merge: CLI > env > file; Zod fills in the remaining defaults.
  const merged = deepMerge(deepMerge(fileConfig, envConfig), cliConfig);
  return ConfigSchema.parse(merged);
}

/** Reads the optional JSON config file from the working directory. */
function loadConfigFile(): Record<string, unknown> {
  const configPath = path.resolve(process.cwd(), CONFIG_FILE);
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (error) {
    console.warn(`Warning: Failed to parse config file at ${configPath}:`, error);
    return {};
  }
}

/** Reads the supported `MONEY_MANAGER_*` environment variables. */
function loadEnvConfig(): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  const baseUrl = process.env["MONEY_MANAGER_BASE_URL"];
  if (baseUrl) {
    deepSet(config, "server.baseUrl", baseUrl);
  }

  const timeout = process.env["MONEY_MANAGER_TIMEOUT"];
  if (timeout) {
    deepSet(config, "server.timeout", parseInt(timeout, 10));
  }

  const retryCount = process.env["MONEY_MANAGER_RETRY_COUNT"];
  if (retryCount) {
    deepSet(config, "server.retryCount", parseInt(retryCount, 10));
  }

  const logLevel = process.env["MONEY_MANAGER_LOG_LEVEL"];
  if (logLevel) {
    deepSet(config, "logging.level", logLevel);
  }

  const sessionPersist = process.env["MONEY_MANAGER_SESSION_PERSIST"];
  if (sessionPersist) {
    deepSet(config, "session.persist", sessionPersist === "true");
  }

  return config;
}

/** Recursively merges `source` into `target` (source wins). */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = result[key];
    if (
      sv !== null &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      result[key] = deepMerge(
        tv as Record<string, unknown>,
        sv as Record<string, unknown>,
      );
    } else if (sv !== undefined) {
      result[key] = sv;
    }
  }
  return result;
}

/** Sets a dotted path (e.g. "server.baseUrl") on `obj`, creating objects as needed. */
function deepSet(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let cursor = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    if (typeof cursor[k] !== "object" || cursor[k] === null) {
      cursor[k] = {};
    }
    cursor = cursor[k] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]!] = value;
}
