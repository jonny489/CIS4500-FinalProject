"use client";

import { useEffect, useState, use } from "react";
import { apiFetch } from "@/lib/api";
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

export default function RecipeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [recipeData, ingredientData] = await Promise.all([
          apiFetch<Recipe>(`/recipes/${id}`),
          apiFetch<{ ingredients: Ingredient[] }>(`/recipes/${id}/ingredients`),
        ]);
        setRecipe(recipeData);
        setIngredients(ingredientData.ingredients);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

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
        <Link
          href="/"
          className="text-blue-500 hover:underline text-sm mb-6 inline-block"
        >
          &larr; Back to search
        </Link>

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          {recipe.name}
        </h1>
        <a
          href={recipe.link.startsWith("http") ? recipe.link : `https://${recipe.link}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline text-sm"
        >
          View original source
        </a>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Ingredients ({ingredients.length})
          </h2>
          {ingredients.length > 0 ? (
            <ul className="space-y-2">
              {ingredients.map((ing) => (
                <li
                  key={ing.ingredient_id}
                  className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
                >
                  <span className="text-zinc-900 dark:text-zinc-50">
                    {ing.ingredient_description}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {ing.quantity} {ing.units}
                  </span>
                </li>
              ))}
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
