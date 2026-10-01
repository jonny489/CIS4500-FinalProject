"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiDelete, apiFetch, apiPost, formatRecipeLink, safeExternalUrl } from "@/lib/api";
import { ErrorPanel, Toast } from "@/components/ui";
import { money, sourceOf } from "@/lib/search";
import { useFetch } from "@/lib/use-fetch";

interface Recipe { recipe_id: number; name: string; link: string; directions: string }
// quantity/units are nullable in needed_for ("salt to taste" has neither).
interface Ingredient { ingredient_id: number; ingredient_description: string; quantity: number | null; units: string | null; ner_label: string }
interface Match { ingredient_id: number; walmart_name: string | null; price: number | null; walmart_link: string | null }
interface Cost { estimated_total: number; currency: string; missing_prices: number }

interface RecipeBundle { recipe: Recipe; ingredients: Ingredient[]; cost: Cost; matches: Map<number, Match> }

/** Everything the detail page shows, fetched in parallel. */
async function fetchRecipeBundle(id: string): Promise<RecipeBundle> {
  const [recipe, ing, cost, m] = await Promise.all([
    apiFetch<Recipe>(`/recipes/${id}`),
    apiFetch<{ ingredients: Ingredient[] }>(`/recipes/${id}/ingredients`),
    apiFetch<Cost>(`/recipes/${id}/estimated-cost`),
    apiFetch<{ matches: Match[] }>(`/recipes/${id}/ingredient-matches`),
  ]);
  return { recipe, ingredients: ing.ingredients, cost, matches: new Map(m.matches.map((x) => [x.ingredient_id, x])) };
}

export default function RecipeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <RecipeDetails id={id} />
    </Suspense>
  );
}

function RecipeDetails({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  // Ingredients the user said they have, carried from the result card via ?have=…
  // Lowercased to match the backend, which compares LOWER(ner_label).
  const have = useSearchParams().getAll("have").map((h) => h.toLowerCase());

  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchBundle = useCallback(() => fetchRecipeBundle(id), [id]);
  const { data, error, loading, reload } = useFetch(fetchBundle);

  useEffect(() => {
    if (!userId) return;
    apiFetch(`/users/${userId}/saved-recipes/${id}`).then(() => setSaved(true)).catch(() => setSaved(false));
  }, [userId, id]);

  async function toggleSave() {
    if (!userId) return router.push(`/login?reason=save&callbackUrl=/recipes/${id}`);
    const was = saved;
    setSaved(!was);
    try {
      if (was) await apiDelete(`/users/${userId}/saved-recipes/${id}`);
      else await apiPost(`/users/${userId}/saved-recipes`, { recipe_id: Number(id) });
      setToast(was ? "Removed from saved" : "Saved");
    } catch {
      setSaved(was);
      setToast("Couldn't update saved recipes");
    }
    setTimeout(() => setToast(null), 1800);
  }

  if (loading) return <DetailSkeleton />;
  if (error || !data)
    return (
      <main className="p-8 flex flex-col gap-5">
        <button onClick={() => router.back()} className="self-start text-muted">← Back</button>
        <ErrorPanel title="Couldn't load this recipe." message={error ?? "Recipe not found"} onRetry={reload} />
      </main>
    );

  const { recipe, ingredients, cost, matches } = data;
  const steps = recipe.directions.split("\n").map((t) => t.trim()).filter(Boolean);
  const owns = (g: Ingredient) => have.includes(g.ner_label.toLowerCase());
  const stillToBuy = ingredients.reduce((sum, g) => {
    const p = matches.get(g.ingredient_id)?.price;
    return owns(g) || p == null ? sum : sum + p;
  }, 0);
  const haveSome = ingredients.some(owns);

  return (
    <main className="flex-1">
      <div className="bg-forest text-paper px-8 pt-8 pb-12">
        <button onClick={() => router.back()} className="text-[15px] text-sage px-3 py-1.5 -ml-3 rounded-full hover:bg-forest-3">← Back</button>
        <div className="flex justify-between items-end gap-8 mt-8 flex-wrap">
          <div className="flex flex-col gap-4 max-w-[820px]">
            <h1 className="text-[84px] font-extrabold leading-[0.92] tracking-[-0.04em] text-balance">{recipe.name}</h1>
            <div className="flex gap-5 text-sage">
              <span>{ingredients.length} ingredients</span>
              <a href={formatRecipeLink(recipe.link)} target="_blank" rel="noopener noreferrer" className="text-lime">{sourceOf(recipe.link)} ↗</a>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            {cost && cost.estimated_total > 0 && (
              <div className="bg-lime text-ink rounded-[20px] px-5.5 py-3.5 flex flex-col">
                <span className="text-[13px] font-semibold">Est. total</span>
                <span className="font-mono text-3xl">{money(cost.estimated_total)}</span>
              </div>
            )}
            <button onClick={toggleSave} className={`rounded-[20px] px-6 py-6.5 font-bold ${saved ? "bg-paper text-ink" : "border-[1.5px] border-moss hover:border-paper"}`}>
              {saved ? "★ Saved" : "☆ Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 pt-10 pb-24 grid grid-cols-[5fr_7fr] gap-10 items-start">
        <section className="flex flex-col gap-4">
          <h2 className="text-[28px] font-extrabold tracking-tight">Ingredients</h2>
          <ul className="bg-white rounded-[20px] p-2">
            {ingredients.map((g) => {
              const m = matches.get(g.ingredient_id);
              const owned = owns(g);
              const amount = [g.quantity, g.units].filter((x) => x != null && x !== "").join(" ");
              const walmartHref = safeExternalUrl(m?.walmart_link);
              return (
                <li key={g.ingredient_id} className="grid grid-cols-[28px_1fr_auto] gap-3 items-center p-3 rounded-xl">
                  {owned ? <span className="size-6 rounded-full bg-lime grid place-items-center text-[13px] font-extrabold">✓</span> : <span className="size-5 rounded-full border-2 border-line" />}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[17px]">{amount && <b className="font-semibold">{amount} </b>}{g.ingredient_description}</span>
                    <span className="text-[13px] text-faint truncate">{m?.walmart_name ?? "No price match"}</span>
                  </div>
                  {walmartHref ? (
                    <a href={walmartHref} target="_blank" rel="noopener noreferrer" className="font-mono text-sm hover:underline">{money(m?.price)}</a>
                  ) : (
                    <span className="font-mono text-sm">{money(m?.price)}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {cost && (
            <div className="bg-ink text-paper rounded-[20px] px-6 py-5 flex flex-col gap-2">
              <div className="flex justify-between"><span>Full shop</span><span className="font-mono">{money(cost.estimated_total)}</span></div>
              {haveSome && <div className="flex justify-between text-lg font-bold text-lime"><span>With what you have</span><span className="font-mono">{money(stillToBuy)}</span></div>}
              {cost.missing_prices > 0 && <span className="text-[13px] text-sage">{cost.missing_prices} ingredient{cost.missing_prices > 1 ? "s" : ""} without price data</span>}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[28px] font-extrabold tracking-tight">Directions</h2>
          <ol>
            {steps.map((t, i) => (
              <li key={i} className="grid grid-cols-[56px_1fr] gap-4 py-5 border-t-[1.5px] border-[#dcdcd5]">
                <span className="text-[40px] font-extrabold leading-none tracking-[-0.04em] text-leaf">{i + 1}</span>
                <span className="text-[19px] leading-relaxed text-pretty">{t}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <Toast text={toast} />
    </main>
  );
}

function DetailSkeleton() {
  return (
    <main aria-busy="true" className="flex-1 animate-pulse">
      <div className="bg-forest px-8 pt-8 pb-12 flex flex-col gap-5">
        <div className="h-4.5 w-20 bg-forest-2 rounded-md" />
        <div className="h-19 w-3/5 bg-forest-2 rounded-xl mt-5" />
        <div className="h-4 w-56 bg-forest-2 rounded-md" />
      </div>
      <div className="px-8 py-10 grid grid-cols-[5fr_7fr] gap-10">
        <div className="bg-white rounded-[20px] h-105" />
        <div className="flex flex-col gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 bg-well rounded-xl" />)}</div>
      </div>
    </main>
  );
}
