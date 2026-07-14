/**
 * Tiny character classifiers used by the JS-literal-to-JSON converter in
 * `http-client.ts`. Kept here so the client stays focused on request flow.
 *
 * These intentionally cover only ASCII identifiers — the Money Manager API's
 * property names are all ASCII (`assetId`, `mbDate`, `category_0`, …). Non-ASCII
 * characters are passed through as part of string bodies or other tokens.
 */

/** True for `[A-Za-z_$]`. */
export function isIdentStart(ch: string | undefined): boolean {
  if (!ch) return false;
  return (
    (ch >= "A" && ch <= "Z") ||
    (ch >= "a" && ch <= "z") ||
    ch === "_" ||
    ch === "$"
  );
}

/** True for `[A-Za-z0-9_$]`. */
export function isIdentPart(ch: string | undefined): boolean {
  if (ch === undefined) return false;
  return isIdentStart(ch) || (ch >= "0" && ch <= "9");
}

/** True for ASCII whitespace (space, tab, newline, carriage return). */
export function isWhitespaceChar(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}
