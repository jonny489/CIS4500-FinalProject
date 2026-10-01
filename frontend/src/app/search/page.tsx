"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiDelete, apiFetch, apiPost } from "@/lib/api";
import { ErrorPanel, Pager, RecipeCard, SkeletonGrid, TagInput, Toast } from "@/components/ui";
import { apiFilterUrl, parseSearch, SAVED_RECIPES_PARAMS, toQuery, type RecipeSummary, type SearchState } from "@/lib/search";
import { useFetch } from "@/lib/use-fetch";

interface FilterResponse {
  recipes: RecipeSummary[];
  pagination: { returned: number; page_size: number };
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8"><SkeletonGrid /></div>}>
      <Search />
    </Suspense>
  );
}

function Search() {
  const router = useRouter();
  const params = useSearchParams();
  const s = parseSearch(params);
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState(s.name);

  // The URL is the source of truth; refetch whenever its query string changes.
  const queryKey = params.toString();
  const fetchRecipes = useCallback(async (): Promise<FilterResponse> => {
    const res = await fetch(apiFilterUrl(parseSearch(new URLSearchParams(queryKey))));
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  }, [queryKey]);
  const { data, error, loading, reload } = useFetch(fetchRecipes);
  const recipes = data?.recipes ?? [];
  // The API has no total count, so a full page is our only hint that another exists.
  const hasMore = data ? data.pagination.returned === data.pagination.page_size : false;

  function update(patch: Partial<SearchState>) {
    router.push(`/search?${toQuery({ ...s, page: 1, ...patch })}`, { scroll: patch.page != null });
  }

  useEffect(() => {
    if (!userId) return;
    apiFetch<{ saved_recipes: { recipe_id: number }[] }>(`/users/${userId}/saved-recipes`, SAVED_RECIPES_PARAMS)
      .then((d) => setSaved(new Set(d.saved_recipes.map((r) => r.recipe_id))))
      // Non-fatal: results still render, stars just show as unsaved. Log it so it isn't silent.
      .catch((e) => console.error("Failed to load saved recipes", e));
  }, [userId]);

  function flash(t: string) {
    setToast(t);
    setTimeout(() => setToast(null), 1800);
  }

  async function toggleSave(id: number) {
    if (!userId) return router.push(`/login?reason=save&callbackUrl=${encodeURIComponent(`/search?${params}`)}`);
    const was = saved.has(id);
    setSaved((p) => { const n = new Set(p); if (was) n.delete(id); else n.add(id); return n; });
    try {
      if (was) await apiDelete(`/users/${userId}/saved-recipes/${id}`);
      else await apiPost(`/users/${userId}/saved-recipes`, { recipe_id: id });
      flash(was ? "Removed from saved" : "Saved");
    } catch {
      setSaved((p) => { const n = new Set(p); if (was) n.add(id); else n.delete(id); return n; });
      flash("Couldn't update saved recipes");
    }
  }

  const filterCount = [s.without.length, s.maxBudget, s.minIng || s.maxIng].filter(Boolean).length;
  const summary = s.have.length ? `using ${s.have.join(", ")}` : s.name ? `matching “${s.name}”` : "in the collection";
  const activeFilters: { label: string; clear: Partial<SearchState> }[] = [
    ...(s.name ? [{ label: `Name: ${s.name}`, clear: { name: "" } }] : []),
    ...s.have.map((n) => ({ label: `Have: ${n}`, clear: { have: s.have.filter((x) => x !== n) } })),
    ...s.without.map((n) => ({ label: `Without: ${n}`, clear: { without: s.without.filter((x) => x !== n) } })),
    ...(s.maxBudget ? [{ label: `Under $${s.maxBudget}`, clear: { maxBudget: "" } }] : []),
    ...(s.minIng || s.maxIng ? [{ label: "Ingredient count", clear: { minIng: "", maxIng: "" } }] : []),
  ];

  return (
    <main className="flex-1 relative">
      <div className="bg-forest px-8 py-5 flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-80 bg-paper rounded-2xl p-2 flex flex-wrap gap-1.5 items-center">
          <span className="font-mono text-xs text-moss px-2">I HAVE</span>
          <TagInput tags={s.have} onChange={(have) => update({ have })} placeholder="add ingredient" />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); update({ name: nameDraft }); }} className="w-70 bg-paper rounded-2xl pl-4 pr-2 py-2 flex items-center gap-2">
          <span className="font-mono text-xs text-moss">NAME</span>
          <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="any" className="flex-1 min-w-0 bg-transparent outline-none py-2" />
        </form>
        <button onClick={() => setFiltersOpen(true)} className="bg-lime text-ink font-bold px-5 py-3.5 rounded-2xl flex gap-2 items-center">
          Filters
          {filterCount > 0 && <span className="bg-ink text-lime font-mono text-xs rounded-full px-1.5">{filterCount}</span>}
        </button>
      </div>

      <div className="p-8 flex flex-col gap-6">
        <div className="flex justify-between items-baseline gap-4 flex-wrap">
          <h1 className="text-[44px] font-extrabold tracking-[-0.03em]">
            Recipes <span className="font-normal text-muted text-[22px] tracking-normal">{summary}</span>
          </h1>
          <select value={s.sort} onChange={(e) => update({ sort: e.target.value as SearchState["sort"] })} className="text-[15px] px-3.5 py-2.5 rounded-xl border-[1.5px] border-ink bg-white">
            <option value="name">Name A–Z</option>
            <option value="price_asc">Cheapest first</option>
            <option value="price_desc">Priciest first</option>
          </select>
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : error ? (
          <ErrorPanel title="Couldn't load recipes." message={error} onRetry={reload} />
        ) : recipes.length === 0 ? (
          <div className="bg-white rounded-3xl p-14 grid grid-cols-[auto_1fr] gap-12 items-center">
            <span className="text-[160px] font-extrabold leading-[0.8] tracking-[-0.06em] text-lime [-webkit-text-stroke:2px_var(--color-ink)]">0</span>
            <div className="flex flex-col gap-4">
              <h2 className="text-4xl font-extrabold tracking-tight">No recipe fits all of that.</h2>
              <p className="text-muted text-[17px]">Drop a filter to widen the search:</p>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((f) => (
                  <button key={f.label} onClick={() => update(f.clear)} className="border-[1.5px] border-ink rounded-full px-4 py-2.5 text-[15px] hover:bg-lime">
                    Drop {f.label}
                  </button>
                ))}
              </div>
              <button onClick={() => router.push("/search")} className="self-start underline">Start over</button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
              {recipes.map((r) => (
                <RecipeCard key={r.recipe_id} r={r} have={s.have} saved={saved.has(r.recipe_id)} onToggleSave={() => toggleSave(r.recipe_id)} />
              ))}
            </div>
            {(s.page > 1 || hasMore) && <Pager page={s.page} hasMore={hasMore} returned={recipes.length} onPage={(page) => update({ page })} />}
          </>
        )}
      </div>

      {filtersOpen && <FilterDrawer s={s} onApply={(p) => { update(p); setFiltersOpen(false); }} onClose={() => setFiltersOpen(false)} />}
      <Toast text={toast} />
    </main>
  );
}

function FilterDrawer({ s, onApply, onClose }: { s: SearchState; onApply: (p: Partial<SearchState>) => void; onClose: () => void }) {
  const [without, setWithout] = useState(s.without);
  const [maxBudget, setMaxBudget] = useState(s.maxBudget);
  const [minIng, setMinIng] = useState(s.minIng);
  const [maxIng, setMaxIng] = useState(s.maxIng);
  const num = "font-mono w-full bg-white rounded-[14px] px-4 py-3.5 outline-none";

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-ink/40 z-10" />
      <aside className="fixed inset-y-0 right-0 w-100 bg-paper z-11 p-8 flex flex-col gap-7 overflow-y-auto shadow-[-20px_0_60px_rgba(20,32,26,0.2)]">
        <div className="flex justify-between items-center">
          <h2 className="text-[32px] font-extrabold tracking-tight">Filters</h2>
          <button onClick={onClose} aria-label="Close" className="size-10 rounded-full bg-white grid place-items-center text-lg">×</button>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="font-semibold">Leave out</span>
          <div className="bg-white rounded-[14px] p-2 flex flex-wrap gap-1.5 items-center">
            <TagInput
              tags={without}
              onChange={setWithout}
              placeholder="allergies, dislikes"
              renderChip={(t, remove) => (
                <span className="inline-flex items-center gap-1 bg-ink text-paper rounded-full pl-3 pr-1.5 py-1.5 text-sm">
                  no {t}
                  <button onClick={remove} aria-label={`Remove ${t}`} className="size-4.5 grid place-items-center text-xs">×</button>
                </span>
              )}
            />
          </div>
        </div>
        <label className="flex flex-col gap-2.5">
          <span className="font-semibold">Max grocery cost</span>
          <div className="bg-white rounded-[14px] flex items-center px-4">
            <span className="font-mono text-muted">$</span>
            <input type="number" min="1" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} placeholder="no limit" className="font-mono flex-1 bg-transparent outline-none px-2 py-3.5" />
          </div>
        </label>
        <div className="flex flex-col gap-2.5">
          <span className="font-semibold">Number of ingredients</span>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5 items-center">
            <input type="number" min="0" value={minIng} onChange={(e) => setMinIng(e.target.value)} placeholder="min" className={num} />
            <span className="text-muted">to</span>
            <input type="number" min="0" value={maxIng} onChange={(e) => setMaxIng(e.target.value)} placeholder="max" className={num} />
          </div>
        </div>
        <div className="mt-auto flex gap-2.5">
          <button onClick={() => { setWithout([]); setMaxBudget(""); setMinIng(""); setMaxIng(""); }} className="px-5 py-4 rounded-full border-[1.5px] border-ink font-semibold">Reset</button>
          <button onClick={() => onApply({ without, maxBudget, minIng, maxIng })} className="flex-1 px-5 py-4 rounded-full bg-ink text-lime font-bold">Apply filters</button>
        </div>
      </aside>
    </>
  );
}
