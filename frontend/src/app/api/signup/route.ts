import { badRequest, proxyToBackend } from "@/lib/backend";

/**
 * POST /api/signup { email, password, name }
 * Signup is public, but the backend's auth routes now require the internal
 * secret, so the browser's request goes through here. Only the three expected
 * string fields are forwarded.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const { email, password, name } = body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
    return badRequest("email, password and name are required");
  }
  return proxyToBackend("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name }) });
}
