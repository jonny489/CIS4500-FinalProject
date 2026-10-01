import type { NextConfig } from "next";

// The single-purpose search pages were folded into /search in the Pantry
// redesign. Redirect them so old bookmarks and shared links keep working.
// Temporary (307) so nothing is cached forever if routes change again.
const LEGACY_SEARCH_ROUTES = ["/fridgesearch", "/budget", "/numingredients", "/excluded"];

// Baseline hardening applied to every response. A full script CSP is left out
// on purpose: Next's inline bootstrap scripts need per-request nonces, which
// would force every page to render dynamically.
const SECURITY_HEADERS = [
  // Block other sites from framing ours (clickjacking). CSP is the modern
  // control; X-Frame-Options covers older browsers.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let browsers guess a response's type (e.g. run a text file as script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only our origin, not full URLs with search terms, to external links.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app uses none of these, so deny them outright.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return LEGACY_SEARCH_ROUTES.map((source) => ({ source, destination: "/search", permanent: false }));
  },
};

export default nextConfig;
