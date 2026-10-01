// Server-side bridge to the FastAPI routes guarded by INTERNAL_API_SECRET
// (auth + saved recipes). Never import this from a Client Component: the build
// fails on purpose if you do, so the secret can't end up in the browser bundle.
import "server-only";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/** Calls a protected backend route with the shared secret attached. */
export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is not set, so the Next.js server can't call protected backend routes.");
  }
  const headers = new Headers(init.headers);
  headers.set("X-Internal-Secret", secret);
  if (init.body) headers.set("Content-Type", "application/json");
  return fetch(`${BACKEND_URL}${path}`, { ...init, headers, cache: "no-store" });
}

/**
 * Forwards a request to the backend and relays its status + body to the
 * browser. Network/config failures become a 502 with a readable message
 * instead of an unhandled exception.
 */
export async function proxyToBackend(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    const res = await backendFetch(path, init);
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e) {
    console.error(`Backend request failed: ${path}`, e);
    return Response.json({ detail: "Backend unavailable" }, { status: 502 });
  }
}

export const unauthorized = () => Response.json({ detail: "Sign in required" }, { status: 401 });
export const badRequest = (detail: string) => Response.json({ detail }, { status: 400 });

/** Accepts only positive integers, so nothing else can be spliced into a backend path. */
export function parseRecipeId(value: unknown): number | null {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : null;
}
