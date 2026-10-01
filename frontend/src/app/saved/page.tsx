"use client";

import { useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { ErrorPanel, SkeletonGrid, Toast } from "@/components/ui";
import { listSavedRecipes, unsaveRecipe } from "@/lib/saved-recipes";
import { money } from "@/lib/search";
import { useFetch } from "@/lib/use-fetch";

export default function SavedRecipesPage() {
  const { status } = useSession();
  const [toast, setToast] = useState<string | null>(null);
  // Optimistically hidden cards. Kept separate from the fetched list so a failed
  // delete can roll back by un-hiding one id without refetching.
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  // null until the session is confirmed, so we don't fetch while signed out.
  // listSavedRecipes is a module-level function, so its identity is stable for
  // useFetch. The API already orders by saved_at DESC.
  const { data, error, loading, reload } = useFetch(status === "authenticated" ? listSavedRecipes : null);
  const recipes = (data ?? []).filter((r) => !removed.has(r.recipe_id));

  // After all hooks so hook order is identical on every render; redirect() throws.
  if (status === "unauthenticated") redirect("/login?reason=saved&callbackUrl=/saved");

  const setHidden = (id: number, hidden: boolean) =>
    setRemoved((prev) => {
      const next = new Set(prev);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });

  async function remove(id: number) {
    setHidden(id, true);
    try {
      await unsaveRecipe(id);
      setToast("Removed from saved");
    } catch {
      setHidden(id, false);
      setToast("Couldn't remove recipe");
    }
    setTimeout(() => setToast(null), 1800);
  }

  return (
    <main className="flex-1 px-8 pt-12 pb-24 flex flex-col gap-7">
      <h1 className="text-[64px] font-extrabold tracking-[-0.035em]">
        Saved {!loading && !error && <span className="text-leaf">{recipes.length}</span>}
      </h1>
      {status === "loading" || loading ? (
        <SkeletonGrid count={3} />
      ) : error ? (
        <ErrorPanel title="Couldn't load your saved recipes." message={error} onRetry={reload} />
      ) : recipes.length === 0 ? (
        <div className="bg-white rounded-3xl p-14 flex flex-col gap-4 items-start">
          <h2 className="text-4xl font-extrabold tracking-tight">Nothing saved yet</h2>
          <p className="text-muted text-[17px]">Star a recipe and it lands here.</p>
          <Link href="/" className="bg-ink text-lime px-6 py-4 rounded-full font-bold">Check my fridge</Link>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {recipes.map((r) => (
            <Link key={r.recipe_id} href={`/recipes/${r.recipe_id}`} className="bg-white rounded-[20px] p-6 flex flex-col gap-5 min-h-37 border-[1.5px] border-transparent hover:border-ink">
              <div className="flex justify-between gap-3">
                <h2 className="text-2xl font-bold leading-tight tracking-tight">{r.name}</h2>
                {r.estimated_total != null && <span className="self-start font-mono bg-well px-2.5 py-1 rounded-lg">{money(r.estimated_total)}</span>}
              </div>
              <div className="mt-auto flex justify-between items-center text-sm text-muted">
                <span>Saved {new Date(r.saved_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <button onClick={(e) => { e.preventDefault(); remove(r.recipe_id); }} className="px-3 py-1.5 rounded-full border-[1.5px] border-line hover:border-ink hover:text-ink">
                  Remove
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Toast text={toast} />
    </main>
  );
}
