/**
 * Only allow same-site paths as post-login destinations. `callbackUrl` comes
 * from the query string, so without this a crafted link like
 * /login?callbackUrl=https://evil.example would bounce users off-site after
 * they sign in (open redirect).
 *
 * Accepts "/saved" or "/search?have=eggs"; rejects absolute URLs,
 * protocol-relative "//host" and the backslash variant "/\host", which some
 * browsers normalise to "//host".
 */
export function safeCallbackUrl(raw: string | null, fallback = "/"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
