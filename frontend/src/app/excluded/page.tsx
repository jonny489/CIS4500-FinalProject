"use client";

import { useState } from "react";
import { formatRecipeLink } from "@/lib/api";
import Link from "next/link";

interface Recipe {
  recipe_id: number;
  name: string;
  link: string;
}

interface SearchResponse {
  recipes: Recipe[];
  pagination: {
    page: number;
    page_size: number;
    returned: number;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const PAGE_SIZE = 20;

export default function ExcludedIngredientsPage() {
  const [inputValue, setInputValue] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  async function fetchPage(ingredientList: string[], page: number) {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API_BASE_URL}/recipes/by-excluded-ingredients`);
      ingredientList.forEach((ing) => url.searchParams.append("ingredient_ners", ing));
      url.searchParams.append("page", String(page));
      url.searchParams.append("page_size", String(PAGE_SIZE));

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
      const data: SearchResponse = await res.json();
      setRecipes(data.recipes);
      setCurrentPage(page);
      setHasMore(data.pagination.returned === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient();
    }
  }

  function addIngredient() {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
    }
    setInputValue("");
  }

  function removeIngredient(ingredient: string) {
    setIngredients((prev) => prev.filter((i) => i !== ingredient));
  }

  function handleSearch() {
    if (ingredients.length === 0) return;
    setSearched(true);
    fetchPage(ingredients, 1);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Exclude Ingredients
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Find recipes that don&apos;t use certain ingredients — great for allergies or dietary restrictions
        </p>

        <div className="mb-6">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type an ingredient to exclude and press Enter..."
              className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {ingredients.map((ingredient) => (
                <span
                  key={ingredient}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full text-sm"
                >
                  {ingredient}
                  <button
                    onClick={() => removeIngredient(ingredient)}
                    className="ml-1 hover:text-red-600 dark:hover:text-red-100"
                    aria-label={`Remove ${ingredient}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={loading || ingredients.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Searching..." : "Find Recipes"}
          </button>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {searched && !loading && recipes.length === 0 && !error && (
          <p className="text-zinc-500">No recipes found. Try excluding fewer ingredients.</p>
        )}

        {recipes.length > 0 && (
          <>
            <div className="max-h-[500px] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <ul className="space-y-3 p-4">
                {recipes.map((recipe) => (
                  <li key={recipe.recipe_id}>
                    <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
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
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between mt-4 py-3 px-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => fetchPage(ingredients, currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Previous
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Page {currentPage}</span>
              <button
                onClick={() => fetchPage(ingredients, currentPage + 1)}
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
