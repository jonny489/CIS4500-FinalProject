// Kept separate from lib/backend.ts because auth.ts imports backend.ts;
// putting this there would create a circular import.
import "server-only";
import { auth } from "@/auth";

/** The signed-in user's id, taken from the server-verified session, never from the client. */
export async function sessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
