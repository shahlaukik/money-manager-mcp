import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/** File holding the last verified PC Manager address. */
const CONNECTION_FILE = "connection.json";

/**
 * Per-user directory for runtime-persisted state (the last verified PC Manager
 * address). Uses the standard per-platform user config location so nothing is
 * written into the working directory (projects, repositories); override with
 * `MONEY_MANAGER_STATE_DIR` to isolate test runs.
 */
export function getStateDir(): string {
  const override = process.env["MONEY_MANAGER_STATE_DIR"];
  if (override) {
    return override;
  }
  if (process.platform === "win32") {
    return path.join(
      process.env["APPDATA"] ?? os.homedir(),
      "money-manager-mcp",
    );
  }
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "money-manager-mcp",
    );
  }
  return path.join(
    process.env["XDG_CONFIG_HOME"] ?? path.join(os.homedir(), ".config"),
    "money-manager-mcp",
  );
}

/** The persisted connection, if `connection_set` ever succeeded here. */
export interface PersistedConnection {
  baseUrl: string;
}

/** Loads the persisted PC Manager address, if one was saved. */
export async function loadPersistedConnection(): Promise<
  PersistedConnection | undefined
> {
  try {
    const raw: unknown = JSON.parse(
      await fs.readFile(path.join(getStateDir(), CONNECTION_FILE), "utf-8"),
    );
    if (
      raw &&
      typeof raw === "object" &&
      typeof (raw as { baseUrl?: unknown }).baseUrl === "string"
    ) {
      return { baseUrl: (raw as PersistedConnection).baseUrl };
    }
    return undefined;
  } catch {
    // A missing or unreadable file is the normal first-run case.
    return undefined;
  }
}

/**
 * Persists the PC Manager address so later sessions start connected where this
 * one ended. Written with owner-only permissions: the address identifies the
 * user's finance server.
 */
export async function savePersistedConnection(baseUrl: string): Promise<void> {
  const dir = getStateDir();
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, CONNECTION_FILE);
  await fs.writeFile(file, JSON.stringify({ baseUrl }, null, 2), {
    mode: 0o600,
  });
  try {
    await fs.chmod(file, 0o600);
  } catch {
    // Filesystems without chmod support (e.g. some Windows shares) are fine.
  }
}
