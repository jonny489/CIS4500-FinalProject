// Browser-side client for this app's own /api/saved-recipes routes. Those
// routes identify the user from the session cookie, so no user id is ever sent
// from the browser (sending one is what allowed reading other users' data).

export interface SavedRecipe {
  recipe_id: number;
  name: string;
  link: string;
  saved_at: string;
  estimated_total?: number;
}

const BASE = "/api/saved-recipes";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function listSavedRecipes(): Promise<SavedRecipe[]> {
  const data = await request<{ saved_recipes: SavedRecipe[] }>("");
  return data.saved_recipes;
}

/** true/false for saved/not saved; throws on real failures instead of guessing "not saved". */
export async function isRecipeSaved(recipeId: number): Promise<boolean> {
  const res = await fetch(`${BASE}/${recipeId}`);
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return true;
}

export function saveRecipe(recipeId: number): Promise<unknown> {
  return request("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipe_id: recipeId }),
  });
}

export function unsaveRecipe(recipeId: number): Promise<unknown> {
  return request(`/${recipeId}`, { method: "DELETE" });
}
