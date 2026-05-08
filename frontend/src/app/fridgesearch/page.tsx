"use client";

import { useState, useEffect } from "react";
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

interface CachedSearch {
  ingredients: string[];
  recipes: Recipe[];
  pagination: Pagination;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const STORAGE_KEY = "fridgeSearchCache";
const PAGE_SIZE = 20;

function saveToCache(data: CachedSearch) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromCache(): CachedSearch | null {
  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  return null;
}

function clearCache() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export default function FridgeSearch() {
  const [inputValue, setInputValue] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      setIngredients(cached.ingredients);
      setRecipes(cached.recipes);
      if (cached.pagination) {
        setPagination(cached.pagination);
        setCurrentPage(cached.pagination.page);
      }
      setSearched(true);
    }
  }, []);

  async function fetchRecipes(ingredientList: string[], page: number = 1) {
    if (ingredientList.length === 0) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const url = new URL(`${API_BASE_URL}/recipes/with-ingredient-ner`);
      ingredientList.forEach((ing) => {
        url.searchParams.append("ingredient_ners", ing);
      });
      url.searchParams.append("page", page.toString());
      url.searchParams.append("page_size", PAGE_SIZE.toString());

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      const data: SearchResponse = await res.json();
      setRecipes(data.recipes);
      setPagination(data.pagination);
      setCurrentPage(page);
      saveToCache({ ingredients: ingredientList, recipes: data.recipes, pagination: data.pagination });
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
      setIngredients([...ingredients, trimmed]);
    }
    setInputValue("");
  }

  function removeIngredient(ingredient: string) {
    const newIngredients = ingredients.filter((i) => i !== ingredient);
    setIngredients(newIngredients);
    if (searched) {
      if (newIngredients.length > 0) {
        fetchRecipes(newIngredients, 1);
      } else {
        clearCache();
        setRecipes([]);
        setPagination(null);
        setCurrentPage(1);
        setSearched(false);
      }
    }
  }

  function handleSearch() {
    if (ingredients.length === 0) return;
    setCurrentPage(1);
    fetchRecipes(ingredients, 1);
  }

  function goToPage(page: number) {
    fetchRecipes(ingredients, page);
  }

  const hasNextPage = pagination && pagination.returned === PAGE_SIZE;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Fridge Search
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Enter the ingredients you have and find recipes that use them
        </p>

        <div className="mb-6">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type an ingredient and press Enter..."
              className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {ingredients.map((ingredient) => (
                <span
                  key={ingredient}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                >
                  {ingredient}
                  <button
                    onClick={() => removeIngredient(ingredient)}
                    className="ml-1 hover:text-blue-600 dark:hover:text-blue-100"
                    aria-label={`Remove ${ingredient}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
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
            {loading ? "Searching..." : "Search Recipes"}
          </button>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {searched && !loading && recipes.length === 0 && !error && (
          <p className="text-zinc-500">
            No recipes found with those ingredients
          </p>
        )}

        {recipes.length > 0 && (
          <div className="flex flex-col">
            <div className="max-h-[500px] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <ul className="space-y-3 p-4">
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
