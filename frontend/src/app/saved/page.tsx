"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { apiFetch, apiDelete, formatRecipeLink } from "@/lib/api";
import Link from "next/link";

const UNSAVE_DEBOUNCE_MS = 1000;

interface SavedRecipe {
  recipe_id: number;
  name: string;
  link: string;
  saved_at: string;
}

export default function SavedRecipesPage() {
  const { data: session, status } = useSession();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const lastRemoveTime = useRef<number>(0);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      setLoading(false);
      return;
    }

    async function fetchSaved() {
      try {
        const data = await apiFetch<{ saved_recipes: SavedRecipe[] }>(
          `/users/${session!.user!.id}/saved-recipes`
        );
        setRecipes(data.saved_recipes);
      } catch (err) {
        console.error("Failed to fetch saved recipes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSaved();
  }, [session, status]);

  const handleUnsave = useCallback(async (recipeId: number) => {
    if (!session?.user?.id) return;
    const now = Date.now();
    if (now - lastRemoveTime.current < UNSAVE_DEBOUNCE_MS) return;
    lastRemoveTime.current = now;
    setRemovingId(recipeId);
    try {
      await apiDelete(`/users/${session.user.id}/saved-recipes/${recipeId}`);
      setRecipes((prev) => prev.filter((r) => r.recipe_id !== recipeId));
    } catch (err) {
      console.error("Failed to unsave recipe:", err);
    } finally {
      setRemovingId(null);
    }
  }, [session?.user?.id]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500">Sign in to view your saved recipes.</p>
        <Link href="/login" className="text-blue-500 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
          Saved Recipes
        </h1>

        {recipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500 mb-4">No saved recipes yet.</p>
            <Link href="/" className="text-blue-500 hover:underline">
              Search for recipes to save
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {recipes.map((recipe) => (
              <li key={recipe.recipe_id}>
                <div className="block p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
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
                      >
                        {recipe.link.replace(/^www\./, "")}
                      </a>
                      <p className="text-sm text-zinc-500 mt-1">
                        Saved {new Date(recipe.saved_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnsave(recipe.recipe_id)}
                      disabled={removingId === recipe.recipe_id}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                    >
                      {removingId === recipe.recipe_id ? "..." : "Remove"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
