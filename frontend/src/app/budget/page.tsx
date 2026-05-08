"use client";

import { useState } from "react";
import { apiFetch, formatRecipeLink } from "@/lib/api";
import Link from "next/link";

interface BudgetRecipe {
  recipe_id: number;
  name: string;
  link: string;
  estimated_total: number;
}

interface BudgetResponse {
  recipes: BudgetRecipe[];
  pagination: {
    page: number;
    page_size: number;
    returned: number;
  };
}

const PAGE_SIZE = 20;

export default function BudgetPage() {
  const [budget, setBudget] = useState("");
  const [currentBudget, setCurrentBudget] = useState("");
  const [recipes, setRecipes] = useState<BudgetRecipe[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function fetchPage(budget: string, targetPage: number) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BudgetResponse>("/recipes/by-budget", {
        max_total: budget,
        page: String(targetPage),
        page_size: String(PAGE_SIZE),
      });
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
    const val = parseFloat(budget);
    if (!budget || isNaN(val) || val <= 0) return;
    setSearched(true);
    setCurrentBudget(budget);
    await fetchPage(budget, 1);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Budget Finder
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Find recipes you can make for a given grocery budget using Walmart prices
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">
              $
            </span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Max budget (e.g. 20)"
              className="w-full pl-8 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
            No recipes found under ${currentBudget}. Try a higher budget.
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
                      <span className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        ${recipe.estimated_total.toFixed(2)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between mt-4 py-3 px-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => fetchPage(currentBudget, page - 1)}
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
                onClick={() => fetchPage(currentBudget, page + 1)}
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
