// Search state lives in the URL (/search?name=…&have=…&without=…) so back/forward
// and shared links work. Replaces the old sessionStorage cache.

export const PAGE_SIZE = 20;
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export type Sort = "name" | "price_asc" | "price_desc";

export interface SearchState {
  name: string;
  have: string[];
  without: string[];
  maxBudget: string;
  minIng: string;
  maxIng: string;
  sort: Sort;
  page: number;
}

export interface RecipeSummary {
  recipe_id: number;
  name: string;
  link: string;
  estimated_total?: number;
  /** Optional: if the backend adds NER labels per recipe, cards show a "you have X of Y" meter. */
  ner_labels?: string[];
}

export const STAPLES = ["eggs", "chicken", "rice", "butter", "garlic", "onion", "potatoes", "cheddar cheese"];

export function parseSearch(p: URLSearchParams): SearchState {
  return {
    name: p.get("name") ?? "",
    have: p.getAll("have"),
    without: p.getAll("without"),
    maxBudget: p.get("max_budget") ?? "",
    minIng: p.get("min") ?? "",
    maxIng: p.get("max") ?? "",
    sort: (p.get("sort") as Sort) ?? "name",
    page: Math.max(1, Number(p.get("page") ?? 1)),
  };
}

export function toQuery(s: Partial<SearchState>): string {
  const q = new URLSearchParams();
  if (s.name) q.set("name", s.name);
  s.have?.forEach((n) => q.append("have", n));
  s.without?.forEach((n) => q.append("without", n));
  if (s.maxBudget) q.set("max_budget", s.maxBudget);
  if (s.minIng) q.set("min", s.minIng);
  if (s.maxIng) q.set("max", s.maxIng);
  if (s.sort && s.sort !== "name") q.set("sort", s.sort);
  if (s.page && s.page > 1) q.set("page", String(s.page));
  return q.toString();
}

export function apiFilterUrl(s: SearchState): string {
  const url = new URL(`${API_BASE_URL}/recipes/filter`);
  if (s.name.trim()) url.searchParams.set("name", s.name.trim());
  s.have.forEach((n) => url.searchParams.append("include_ners", n));
  s.without.forEach((n) => url.searchParams.append("exclude_ners", n));
  if (s.sort !== "name") url.searchParams.set("sort", s.sort);
  if (s.maxBudget) url.searchParams.set("max_budget", s.maxBudget);
  if (s.minIng) url.searchParams.set("min_ingredients", s.minIng);
  if (s.maxIng) url.searchParams.set("max_ingredients", s.maxIng);
  url.searchParams.set("page", String(s.page));
  url.searchParams.set("page_size", String(PAGE_SIZE));
  return url.toString();
}

/**
 * GET /users/:id/saved-recipes returns 20 rows unless told otherwise (100 is
 * its max). Both the Saved page and the stars on result cards need the whole
 * list, so always ask for the max.
 */
export const SAVED_RECIPES_PARAMS = { limit: "100" };

export const money =(n?: number | null) => (n == null ? "—" : `$${n.toFixed(2)}`);
export const sourceOf = (link: string) => link.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
