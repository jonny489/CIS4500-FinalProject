"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

interface Recipe {
  recipe_id: number;
  name: string;
  link: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await apiFetch<Recipe[]>("/recipes/search", {
        name: query,
        limit: "20",
      });
      setRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

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
          <ul className="space-y-3">
            {recipes.map((recipe) => (
              <li key={recipe.recipe_id}>
                <Link
                  href={`/recipes/${recipe.recipe_id}`}
                  className="block p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                    {recipe.name}
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">{recipe.link}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}