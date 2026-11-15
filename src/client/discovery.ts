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
    throw new Error(probeFailureReason(error));
  }
}
