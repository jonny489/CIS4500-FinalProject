"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch, formatRecipeLink } from "@/lib/api";
import Link from "next/link";

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
                <Link
                  href={`/recipes/${recipe.recipe_id}`}
                  className="block p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                    {recipe.name}
                  </h2>
                  <a
                    href={formatRecipeLink(recipe.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-blue-500 hover:underline mt-1 inline-block"
                  >
                    {recipe.link.replace(/^www\./, "")}
                  </a>
                  <p className="text-sm text-zinc-500 mt-1">
                    Saved {new Date(recipe.saved_at).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
