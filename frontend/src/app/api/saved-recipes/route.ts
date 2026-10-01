import { badRequest, parseRecipeId, proxyToBackend, unauthorized } from "@/lib/backend";
import { sessionUserId } from "@/lib/session";

// The backend pages saved recipes 20 at a time by default; 100 is its max.
// The Saved page and the stars on result cards both need the whole list.
const SAVED_LIMIT = 100;

/** GET /api/saved-recipes: the signed-in user's saved recipes. */
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();
  return proxyToBackend(`/users/${encodeURIComponent(userId)}/saved-recipes?limit=${SAVED_LIMIT}`);
}

/** POST /api/saved-recipes { recipe_id }: save a recipe for the signed-in user. */
export async function POST(req: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  const body: unknown = await req.json().catch(() => null);
  const recipeId = parseRecipeId((body as { recipe_id?: unknown } | null)?.recipe_id);
  if (recipeId == null) return badRequest("recipe_id must be a positive integer");

  return proxyToBackend(`/users/${encodeURIComponent(userId)}/saved-recipes`, {
    method: "POST",
    body: JSON.stringify({ recipe_id: recipeId }),
  });
}
