"use client";

import { useState } from "react";
import Link from "next/link";
import { money, PAGE_SIZE, sourceOf, type RecipeSummary } from "@/lib/search";

export function IngredientChip({ name, onRemove, size = "md" }: { name: string; onRemove: () => void; size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-lime text-ink font-semibold ${size === "lg" ? "pl-4 pr-2.5 py-2.5 text-[17px]" : "pl-3 pr-1.5 py-1.5 text-[15px]"}`}>
      {name}
      <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="size-5 rounded-full grid place-items-center bg-ink/10 text-xs hover:bg-ink/20">
        ×
      </button>
    </span>
  );
}

/** Chips + free input. Enter adds, Backspace on empty removes the last chip. */
export function TagInput({
  tags, onChange, placeholder, size = "md", onSubmit, renderChip,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  size?: "md" | "lg";
  onSubmit?: (tags: string[]) => void;
  renderChip?: (t: string, remove: () => void) => React.ReactNode;
}) {
  const [value, setValue] = useState("");
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = value.trim().toLowerCase();
      if (v) {
        if (!tags.includes(v)) onChange([...tags, v]);
        setValue("");
      } else onSubmit?.(tags);
    } else if (e.key === "Backspace" && !value && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }
  return (
    <>
      {tags.map((t) => {
        const remove = () => onChange(tags.filter((x) => x !== t));
        return renderChip ? <span key={t}>{renderChip(t, remove)}</span> : <IngredientChip key={t} name={t} size={size} onRemove={remove} />;
      })}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`flex-1 bg-transparent border-none outline-none text-ink ${size === "lg" ? "min-w-44 text-xl px-2 py-2.5" : "min-w-30 text-base p-2"}`}
      />
    </>
  );
}

export function SaveStar({ saved, onToggle, busy }: { saved: boolean; onToggle: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={saved ? "Unsave" : "Save"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      className={`shrink-0 size-9 rounded-full grid place-items-center text-base disabled:opacity-50 ${saved ? "bg-ink text-lime" : "border-[1.5px] border-line text-faint hover:border-ink hover:text-ink"}`}
    >
      {saved ? "★" : "☆"}
    </button>
  );
}

export function RecipeCard({ r, have, saved, onToggleSave }: { r: RecipeSummary; have: string[]; saved?: boolean; onToggleSave?: () => void }) {
  const ners = r.ner_labels;
  const hasCount = ners ? ners.filter((n) => have.includes(n)).length : 0;
  const need = ners ? ners.filter((n) => !have.includes(n)) : [];
  return (
    <Link href={`/recipes/${r.recipe_id}${have.length ? `?${have.map((h) => `have=${encodeURIComponent(h)}`).join("&")}` : ""}`} className="bg-white rounded-[20px] p-6 flex flex-col gap-4 border-[1.5px] border-transparent hover:border-ink">
      <div className="flex justify-between items-start gap-3">
        <h2 className="text-2xl font-bold leading-tight tracking-tight">{r.name}</h2>
        {onToggleSave && <SaveStar saved={!!saved} onToggle={onToggleSave} />}
      </div>
      {ners && have.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="h-2.5 bg-well rounded-full overflow-hidden">
            <div className="h-full bg-leaf rounded-full" style={{ width: `${(hasCount / ners.length) * 100}%` }} />
          </div>
          <p className="text-sm leading-snug">
            <b>You have {hasCount}</b> of {ners.length} · <span className="text-muted">need {need.slice(0, 4).join(", ")}{need.length > 4 ? ` +${need.length - 4} more` : ""}</span>
          </p>
        </div>
      )}
      <div className="mt-auto flex justify-between items-center text-sm text-muted">
        <span>{sourceOf(r.link)}</span>
        {r.estimated_total != null && <span className="font-mono text-base text-ink bg-well px-2.5 py-1 rounded-lg">{money(r.estimated_total)}</span>}
      </div>
    </Link>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading recipes" className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-[20px] p-6 h-37 flex flex-col gap-3.5 animate-pulse">
          <div className="h-5.5 w-[70%] bg-well rounded-md" />
          <div className="h-2.5 bg-well rounded-full" />
          <div className="mt-auto flex justify-between">
            <div className="h-3.5 w-[45%] bg-well rounded-md" />
            <div className="h-6.5 w-16 bg-well rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorPanel({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="bg-white rounded-3xl p-12 flex flex-col gap-3.5 items-start border-[1.5px] border-[#e6c3b6]">
      <span className="font-mono text-[13px] text-danger">{message}</span>
      <h2 className="text-[32px] font-extrabold tracking-tight">{title}</h2>
      <p className="text-muted leading-relaxed">Check that the backend is running, then try again. Your search and filters are kept.</p>
      <button onClick={onRetry} className="mt-1.5 bg-ink text-lime font-bold px-5.5 py-3.5 rounded-full hover:bg-forest">Try again</button>
    </div>
  );
}

export function Pager({ page, hasMore, returned, onPage }: { page: number; hasMore: boolean; returned: number; onPage: (p: number) => void }) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const base = "px-5 py-3 rounded-full font-semibold border-[1.5px]";
  return (
    <nav className="flex justify-between items-center gap-4 pt-2">
      <button disabled={page === 1} onClick={() => onPage(page - 1)} className={`${base} border-ink hover:bg-ink hover:text-lime disabled:border-line disabled:text-[#9aa29c] disabled:hover:bg-transparent`}>
        ← Previous
      </button>
      <span className="font-mono text-sm text-muted">Page {page} · {start}–{start + returned - 1}</span>
      <button disabled={!hasMore} onClick={() => onPage(page + 1)} className={`${base} border-ink bg-ink text-lime font-bold hover:bg-forest disabled:bg-transparent disabled:border-line disabled:text-[#9aa29c]`}>
        Next page →
      </button>
    </nav>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="status" className="fixed left-1/2 bottom-8 -translate-x-1/2 z-20 bg-ink text-paper rounded-full px-5.5 py-3.5 font-semibold flex items-center gap-2.5 shadow-[0_12px_40px_rgba(20,32,26,0.3)]">
      <span className="size-2 rounded-full bg-lime" />
      {text}
    </div>
  );
}
