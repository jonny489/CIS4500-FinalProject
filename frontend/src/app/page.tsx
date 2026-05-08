"use client";

import { useState } from "react";
import { apiFetch, formatRecipeLink } from "@/lib/api";
import Link from "next/link";

interface Recipe {
  recipe_id: number;
  name: string;
  link: string;
}

interface Pagination {
  page: number;
  page_size: number;
  returned: number;
}

interface SearchResponse {
  recipes: Recipe[];
  pagination: Pagination;
}

const PAGE_SIZE = 20;

export default function Home() {
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  async function fetchRecipes(searchQuery: string, page: number = 1) {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await apiFetch<SearchResponse>("/recipes/search", {
        name: searchQuery,
        page: page.toString(),
        page_size: PAGE_SIZE.toString(),
      });
      setRecipes(data.recipes);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCurrentPage(1);
    fetchRecipes(query, 1);
  }

  function goToPage(page: number) {
    fetchRecipes(query, page);
  }

  const hasNextPage = pagination && pagination.returned === PAGE_SIZE;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Recipe Search
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Search our database of recipes by name
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a recipe..."
            className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && (
          <p className="text-red-500 mb-4">{error}</p>
        )}

        {searched && !loading && recipes.length === 0 && !error && (
          <p className="text-zinc-500">No recipes found for &quot;{query}&quot;</p>
        )}

        {recipes.length > 0 && (
          <div className="flex flex-col">
            <div className="max-h-[500px] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <ul className="space-y-3 p-4">
                {recipes.map((recipe) => (
                  <li
                    key={recipe.recipe_id}
                    className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
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
                    >
                      {recipe.link.replace(/^www\./, "")}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between mt-4 py-3 px-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={!hasPrevPage || loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Previous
              </button>

              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Page {currentPage}
              </span>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={!hasNextPage || loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}