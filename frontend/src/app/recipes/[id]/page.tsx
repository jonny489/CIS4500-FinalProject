"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { apiFetch, apiPost, apiDelete, formatRecipeLink } from "@/lib/api";

interface CostEstimate {
  estimated_total: number;
  currency: string;
  missing_prices: number;
}

interface IngredientMatch {
  ingredient_id: number;
  walmart_name: string | null;
  price: number | null;
  walmart_link: string | null;
}
import Link from "next/link";

interface Recipe {
  recipe_id: number;
  name: string;
  link: string;
  directions: string;
}

interface Ingredient {
  ingredient_id: number;
  ingredient_description: string;
  quantity: number;
  units: string;
  ner_label: string;
}

const FRIDGE_SEARCH_CACHE_KEY = "fridgeSearchCache";

export default function RecipeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFromFridgeSearch, setHasFromFridgeSearch] = useState(false);

  useEffect(() => {
    const cached = sessionStorage.getItem(FRIDGE_SEARCH_CACHE_KEY);
    setHasFromFridgeSearch(!!cached);
  }, []);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cost, setCost] = useState<CostEstimate | null>(null);
  const [matchMap, setMatchMap] = useState<Map<number, IngredientMatch>>(new Map());

  useEffect(() => {
    async function fetchData() {
      try {
        const [recipeData, ingredientData, costData, matchData] = await Promise.all([
          apiFetch<Recipe>(`/recipes/${id}`),
          apiFetch<{ ingredients: Ingredient[] }>(`/recipes/${id}/ingredients`),
          apiFetch<CostEstimate>(`/recipes/${id}/estimated-cost`),
          apiFetch<{ matches: (IngredientMatch & { ingredient_id: number })[] }>(`/recipes/${id}/ingredient-matches`),
        ]);
        setRecipe(recipeData);
        setIngredients(ingredientData.ingredients);
        setCost(costData);
        const map = new Map<number, IngredientMatch>();
        for (const m of matchData.matches) map.set(m.ingredient_id, m);
        setMatchMap(map);

        if (session?.user?.id) {
          try {
            await apiFetch(`/users/${session.user.id}/saved-recipes/${id}`);
            setSaved(true);
          } catch {
            setSaved(false);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, session?.user?.id]);

  async function handleToggleSave() {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      if (saved) {
        await apiDelete(`/users/${session.user.id}/saved-recipes/${id}`);
        setSaved(false);
      } else {
        await apiPost(`/users/${session.user.id}/saved-recipes`, {
          recipe_id: parseInt(id),
        });
        setSaved(true);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500">Loading recipe...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error ?? "Recipe not found"}</p>
        <Link href="/" className="text-blue-500 hover:underline">
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex gap-4 mb-6">
          <Link
            href="/"
            className="text-blue-500 hover:underline text-sm"
          >
            &larr; Back to search
          </Link>
          {hasFromFridgeSearch && (
            <Link
              href="/fridgesearch"
              className="text-blue-500 hover:underline text-sm"
            >
              &larr; Back to Fridge Search
            </Link>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              {recipe.name}
            </h1>
            <a
              href={formatRecipeLink(recipe.link)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm"
            >
              View original source
            </a>
            {cost && cost.estimated_total > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Estimated cost: ${cost.estimated_total.toFixed(2)} {cost.currency}
                </span>
                {cost.missing_prices > 0 && (
                  <span className="text-xs text-zinc-400">
                    ({cost.missing_prices} ingredient{cost.missing_prices !== 1 ? "s" : ""} without price data)
                  </span>
                )}
              </div>
            )}
          </div>
          {session?.user && (
            <button
              onClick={handleToggleSave}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved
                  ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {saving ? "..." : saved ? "Unsave" : "Save Recipe"}
            </button>
          )}
        </div>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Ingredients ({ingredients.length})
          </h2>
          {ingredients.length > 0 ? (
            <ul className="space-y-2">
              {ingredients.map((ing) => {
                const match = matchMap.get(ing.ingredient_id);
                return (
                  <li
                    key={ing.ingredient_id}
                    className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
                  >
                    <span className="text-zinc-900 dark:text-zinc-50">
                      {ing.ingredient_description}
                      <span className="ml-2 text-sm text-zinc-500">
                        {ing.quantity} {ing.units}
                      </span>
                    </span>
                    {match?.walmart_name && match.price != null ? (
                      <a
                        href={match.walmart_link ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 ml-4 flex items-center gap-2 hover:underline"
                      >
                        <span className="text-xs text-zinc-400 max-w-[160px] truncate">
                          {match.walmart_name}
                        </span>
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          ${match.price.toFixed(2)}
                        </span>
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-zinc-500">No ingredients listed.</p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Directions
          </h2>
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
              {recipe.directions}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
