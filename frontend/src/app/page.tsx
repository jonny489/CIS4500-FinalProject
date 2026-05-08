"use client";

import { useState, useEffect } from "react";
import { formatRecipeLink } from "@/lib/api";
import Link from "next/link";

const SEARCH_CACHE_KEY = "recipeSearchCache";

interface Recipe {
  recipe_id: number;
  name: string;
  link: string;
  estimated_total?: number;
}

interface Pagination {
  page: number;
  page_size: number;
  returned: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const PAGE_SIZE = 20;

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
  tagColor,
  inputValue,
  onInputChange,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder: string;
  tagColor: "blue" | "red";
  inputValue: string;
  onInputChange: (v: string) => void;
}) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputValue.trim().toLowerCase();
      if (trimmed && !tags.includes(trimmed)) onAdd(trimmed);
      onInputChange("");
    }
  }

  const colorClass =
    tagColor === "blue"
      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
      : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";

  return (
    <div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tag) => (
            <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
              {tag}
              <button onClick={() => onRemove(tag)} className="ml-0.5 hover:opacity-70">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [includeNers, setIncludeNers] = useState<string[]>([]);
  const [excludeNers, setExcludeNers] = useState<string[]>([]);
  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [minIngredients, setMinIngredients] = useState("");
  const [maxIngredients, setMaxIngredients] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState("name");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(SEARCH_CACHE_KEY);
      if (!cached) return;
      const s = JSON.parse(cached);
      setQuery(s.query ?? "");
      setIncludeNers(s.includeNers ?? []);
      setExcludeNers(s.excludeNers ?? []);
      setMaxBudget(s.maxBudget ?? "");
      setMinIngredients(s.minIngredients ?? "");
      setMaxIngredients(s.maxIngredients ?? "");
      setSort(s.sort ?? "name");
      setRecipes(s.recipes ?? []);
      setCurrentPage(s.currentPage ?? 1);
      setHasMore(s.hasMore ?? false);
      setSearched(s.searched ?? false);
      if (s.includeNers?.length > 0 || s.excludeNers?.length > 0 || s.maxBudget || s.minIngredients || s.maxIngredients || s.sort !== "name") {
        setShowFilters(true);
      }
    } catch {
      sessionStorage.removeItem(SEARCH_CACHE_KEY);
    }
  }, []);

  const activeFilterCount = [
    includeNers.length > 0,
    excludeNers.length > 0,
    maxBudget !== "",
    minIngredients !== "" || maxIngredients !== "",
    sort !== "name",
  ].filter(Boolean).length;

  async function fetchRecipes(page: number, overrideInclude?: string[], overrideExclude?: string[]) {
    setLoading(true);
    setError(null);
    setSearched(true);
    const include = overrideInclude ?? includeNers;
    const exclude = overrideExclude ?? excludeNers;
    try {
      const url = new URL(`${API_BASE_URL}/recipes/filter`);
      if (query.trim()) url.searchParams.set("name", query.trim());
      include.forEach((n) => url.searchParams.append("include_ners", n));
      exclude.forEach((n) => url.searchParams.append("exclude_ners", n));
      if (sort !== "name") url.searchParams.set("sort", sort);
      if (maxBudget) url.searchParams.set("max_budget", maxBudget);
      if (minIngredients) url.searchParams.set("min_ingredients", minIngredients);
      if (maxIngredients) url.searchParams.set("max_ingredients", maxIngredients);
      url.searchParams.set("page", String(page));
      url.searchParams.set("page_size", String(PAGE_SIZE));

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
      const data: { recipes: Recipe[]; pagination: Pagination } = await res.json();
      setRecipes(data.recipes);
      setCurrentPage(page);
      const more = data.pagination.returned === PAGE_SIZE;
      setHasMore(more);
      sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify({
        query, includeNers: include, excludeNers: exclude,
        maxBudget, minIngredients, maxIngredients, sort,
        recipes: data.recipes, currentPage: page, hasMore: more, searched: true,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // Flush any pending tag input that hasn't been Enter'd yet
    const pendingInclude = includeInput.trim().toLowerCase();
    const pendingExclude = excludeInput.trim().toLowerCase();
    const finalInclude = pendingInclude && !includeNers.includes(pendingInclude)
      ? [...includeNers, pendingInclude]
      : includeNers;
    const finalExclude = pendingExclude && !excludeNers.includes(pendingExclude)
      ? [...excludeNers, pendingExclude]
      : excludeNers;
    if (pendingInclude && !includeNers.includes(pendingInclude)) {
      setIncludeNers(finalInclude);
      setIncludeInput("");
    }
    if (pendingExclude && !excludeNers.includes(pendingExclude)) {
      setExcludeNers(finalExclude);
      setExcludeInput("");
    }
    fetchRecipes(1, finalInclude, finalExclude);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Recipe Search</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Search recipes by name and filter by ingredients, budget, and more
        </p>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by recipe name..."
              className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V17a1 1 0 01-.553.894l-4 2A1 1 0 017 19v-8.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-blue-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showFilters && (
            <div className="grid grid-cols-1 gap-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Ingredients I have (fridge search)
                </label>
                <TagInput
                  tags={includeNers}
                  onAdd={(t) => setIncludeNers((p) => [...p, t])}
                  onRemove={(t) => setIncludeNers((p) => p.filter((x) => x !== t))}
                  placeholder="Type an ingredient and press Enter..."
                  tagColor="blue"
                  inputValue={includeInput}
                  onInputChange={setIncludeInput}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Ingredients to exclude
                </label>
                <TagInput
                  tags={excludeNers}
                  onAdd={(t) => setExcludeNers((p) => [...p, t])}
                  onRemove={(t) => setExcludeNers((p) => p.filter((x) => x !== t))}
                  placeholder="Type an ingredient to exclude and press Enter..."
                  tagColor="red"
                  inputValue={excludeInput}
                  onInputChange={setExcludeInput}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Max budget (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Sort by
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="name">Name (A–Z)</option>
                    <option value="price_asc">Price (low to high)</option>
                    <option value="price_desc">Price (high to low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Ingredient count
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={minIngredients}
                      onChange={(e) => setMinIngredients(e.target.value)}
                      placeholder="Min"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-zinc-400 text-sm">–</span>
                    <input
                      type="number"
                      min="0"
                      value={maxIngredients}
                      onChange={(e) => setMaxIngredients(e.target.value)}
                      placeholder="Max"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIncludeNers([]);
                    setExcludeNers([]);
                    setMaxBudget("");
                    setMinIngredients("");
                    setMaxIngredients("");
                    setSort("name");
                    sessionStorage.removeItem(SEARCH_CACHE_KEY);
                  }}
                  className="text-sm text-zinc-500 hover:text-red-500 transition-colors text-left"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </form>

        {error && <p className="text-red-500 mt-6 mb-4">{error}</p>}

        {searched && !loading && recipes.length === 0 && !error && (
          <p className="text-zinc-500 mt-6">No recipes found. Try adjusting your search or filters.</p>
        )}

        {recipes.length > 0 && (
          <div className="mt-6 flex flex-col">
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
                      {recipe.estimated_total != null && (
                        <span className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          ${recipe.estimated_total.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between mt-4 py-3 px-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => fetchRecipes(currentPage - 1)}
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
                onClick={() => fetchRecipes(currentPage + 1)}
                disabled={!hasMore || loading}
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
