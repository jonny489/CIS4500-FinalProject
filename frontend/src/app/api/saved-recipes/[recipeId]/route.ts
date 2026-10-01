import { badRequest, parseRecipeId, proxyToBackend, unauthorized } from "@/lib/backend";
import { sessionUserId } from "@/lib/session";

type Ctx = { params: Promise<{ recipeId: string }> };

/** Resolves the signed-in user + validated recipe id, or the error response to return. */
async function resolve(ctx: Ctx): Promise<{ path: string } | { error: Response }> {
  const userId = await sessionUserId();
  if (!userId) return { error: unauthorized() };
  const recipeId = parseRecipeId((await ctx.params).recipeId);
  if (recipeId == null) return { error: badRequest("recipeId must be a positive integer") };
  return { path: `/users/${encodeURIComponent(userId)}/saved-recipes/${recipeId}` };
}

/** GET /api/saved-recipes/:id: 200 if the signed-in user saved it, 404 if not. */
export async function GET(_req: Request, ctx: Ctx) {
  const r = await resolve(ctx);
  return "error" in r ? r.error : proxyToBackend(r.path);
}

/** DELETE /api/saved-recipes/:id: unsave it for the signed-in user. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const r = await resolve(ctx);
  return "error" in r ? r.error : proxyToBackend(r.path, { method: "DELETE" });
}
