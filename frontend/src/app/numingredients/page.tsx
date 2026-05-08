"use client";

import { useState } from "react";
import { apiFetch, formatRecipeLink } from "@/lib/api";
import Link from "next/link";

interface Recipe {
  recipe_id: number;
  name: string;
  link: string;
  ingredients_count: number;
}

interface NumIngredientsResponse {
  recipes: Recipe[];
  pagination: {
    page: number;
    page_size: number;
    max_recipes: number;
    returned: number;
  };
}

const PAGE_SIZE = 20;

export default function NumIngredientsPage() {
  const [maxIngredients, setMaxIngredients] = useState("");
  const [minIngredients, setMinIngredients] = useState("");
  const [currentMax, setCurrentMax] = useState("");
  const [currentMin, setCurrentMin] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function fetchPage(max: string, min: string, targetPage: number) {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        max_ingredients: max,
        page: String(targetPage),
        page_size: String(PAGE_SIZE),
      };
      if (min) {
        params.min_ingredients = min;
      }
      const data = await apiFetch<NumIngredientsResponse>("/recipes/num-ingredients", params);
      setRecipes(data.recipes);
      setPage(targetPage);
      setHasMore(data.pagination.returned === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const maxVal = parseInt(maxIngredients);
    if (!maxIngredients || isNaN(maxVal) || maxVal < 0) {
      setError("Please enter a valid max ingredients value");
      return;
    }
    const minVal = minIngredients ? parseInt(minIngredients) : 0;
    if (minIngredients && (isNaN(minVal) || minVal < 0)) {
      setError("Please enter a valid min ingredients value");
      return;
    }
    if (minVal > maxVal) {
      setError("Min ingredients cannot be greater than max ingredients");
      return;
    }
    setSearched(true);
    setCurrentMax(maxIngredients);
    setCurrentMin(minIngredients);
    await fetchPage(maxIngredients, minIngredients, 1);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Filter by Ingredients Count
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Find recipes with a specific number of ingredients
        </p>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <label
                htmlFor="minIngredients"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Min Ingredients <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                id="minIngredients"
                type="number"
                min="0"
                step="1"
                value={minIngredients}
                onChange={(e) => setMinIngredients(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="maxIngredients"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Max Ingredients <span className="text-red-500">*</span>
              </label>
              <input
                id="maxIngredients"
                type="number"
                min="0"
                step="1"
                value={maxIngredients}
                onChange={(e) => setMaxIngredients(e.target.value)}
                placeholder="e.g. 10"
                required
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Searching..." : "Find Recipes"}
          </button>
        </form>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {searched && !loading && recipes.length === 0 && !error && (
          <p className="text-zinc-500">
            No recipes found with {currentMin ? `${currentMin}-` : "up to "}{currentMax} ingredients. Try adjusting your range.
          </p>
        )}

        {recipes.length > 0 && (
          <>
            <div className="max-h-[500px] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <ul className="space-y-3 p-4">
                {recipes.map((recipe) => (
                  <li
                    key={recipe.recipe_id}
                    className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link href={`/recipes/${recipe.recipe_id}`}>
                          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 hover:text-blue-500 transition-colors">
                            {recipe.name}
                          </h2>
                        </Link>
                        <a
                          href={formatRecipeLink(recipe.link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline mt-1 inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {recipe.link.replace(/^www\./, "")}
                        </a>
                      </div>
                      <span className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        {recipe.ingredients_count} ingredients
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between mt-4 py-3 px-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => fetchPage(currentMax, currentMin, page - 1)}
                disabled={page === 1 || loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Previous
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Page {page}</span>
              <button
                onClick={() => fetchPage(currentMax, currentMin, page + 1)}
                disabled={!hasMore || loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
