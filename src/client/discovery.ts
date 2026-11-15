import * as os from "node:os";

import axios from "axios";

/** Timeout for a single server-verification probe. */
const PROBE_TIMEOUT_MS = 3000;

/** Maps an axios failure to a short reason worth surfacing to the model. */
function probeFailureReason(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      return `HTTP ${error.response.status} — not a Money Manager server`;
    }
    if (error.code === "ECONNREFUSED") return "connection refused";
    if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
      return "timed out";
    }
    if (error.code === "ENOTFOUND") return "host not found";
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Verifies that a Money Manager PC Manager server answers at `origin`.
 *
 * An open port is not enough — printers and router admin panels live on these
 * ports too — so the probe requires a 200 from `/moneyBook/getInitData`, a
 * path only the Money Manager server serves. Throws an Error whose message is
 * a short reason on failure.
 */
export async function checkMoneyManagerAt(
  origin: string,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<void> {
  try {
    await axios.get(`${origin}/moneyBook/getInitData`, {
      timeout: timeoutMs,
      validateStatus: (status) => status === 200,
    });
  } catch (error) {
    throw new Error(probeFailureReason(error), { cause: error });
  }
}

// ---------------------------------------------------------------- discovery

/** A Money Manager server found on the local network. */
export interface DiscoveredServer {
  baseUrl: string;
  host: string;
  port: number;
}

/** Per-probe timeout and concurrency for the LAN scan. */
const SCAN_TIMEOUT_MS = 1000;
const SCAN_CONCURRENCY = 128;

/** Boolean variant of checkMoneyManagerAt for high-volume scanning. */
async function isMoneyManagerAt(origin: string): Promise<boolean> {
  try {
    await checkMoneyManagerAt(origin, SCAN_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}

/** The /24 prefixes of every non-internal IPv4 interface (deduplicated). */
function lanPrefixes(): string[] {
  const prefixes = new Set<string>();
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      // Loopback and other internal interfaces are skipped. Only the local
      // /24 of each interface is scanned, whatever the real mask is — PC
      // Manager is a same-subnet Wi-Fi device, and this keeps the scan
      // bounded on wide (e.g. corporate /16) networks.
      if (address.family !== "IPv4" || address.internal) continue;
      prefixes.add(`${address.address.split(".").slice(0, 3).join(".")}.`);
    }
  }
  return [...prefixes];
}

/**
 * Scans the local network(s) for Money Manager servers on the given ports.
 * Every hit is verified with the /moneyBook/getInitData handshake, so
 * printers or router admin panels sharing these ports are not reported.
 */
export async function discoverMoneyManagers(
  ports: number[],
): Promise<DiscoveredServer[]> {
  const targets: { host: string; port: number }[] = [];
  for (const prefix of lanPrefixes()) {
    for (let i = 1; i <= 254; i++) {
      for (const port of ports) {
        targets.push({ host: `${prefix}${i}`, port });
      }
    }
  }

  const found: DiscoveredServer[] = [];
  let next = 0;
  async function worker(): Promise<void> {
    while (next < targets.length) {
      const target = targets[next++]!;
      const origin = `http://${target.host}:${target.port}`;
      if (await isMoneyManagerAt(origin)) {
        found.push({ baseUrl: origin, host: target.host, port: target.port });
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(SCAN_CONCURRENCY, targets.length) }, worker),
  );
  return found;
}
