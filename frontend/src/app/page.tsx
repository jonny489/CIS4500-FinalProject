"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TagInput } from "@/components/ui";
import { STAPLES, toQuery } from "@/lib/search";

export default function Home() {
  const router = useRouter();
  const [have, setHave] = useState<string[]>([]);
  const [name, setName] = useState("");

  const goFridge = (tags = have) => router.push(`/search?${toQuery({ have: tags })}`);
  const goName = () => router.push(`/search?${toQuery({ name })}`);

  return (
    <main className="flex-1 grid grid-cols-2 min-h-[calc(100vh-4rem)]">
      <section className="bg-forest text-paper px-14 py-18 flex flex-col gap-7">
        <span className="font-mono text-[13px] text-lime tracking-wide">FRIDGE SEARCH</span>
        <h1 className="text-7xl font-extrabold leading-[0.95] tracking-[-0.035em]">What&apos;s in your fridge?</h1>
        <p className="text-lg leading-relaxed text-sage max-w-[460px]">
          Add what you have. We&apos;ll find recipes that use it and show what&apos;s left to buy.
        </p>
        <div className="bg-paper rounded-[20px] p-3.5 flex flex-wrap gap-2 items-center min-h-16">
          <TagInput tags={have} onChange={setHave} onSubmit={goFridge} size="lg" placeholder="eggs, rice, spinach…" />
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-sm text-sage">Common staples</span>
          <div className="flex flex-wrap gap-2">
            {STAPLES.filter((s) => !have.includes(s)).map((s) => (
              <button key={s} onClick={() => setHave([...have, s])} className="border-[1.5px] border-moss rounded-full px-3.5 py-2 text-[15px] hover:border-lime hover:text-lime">
                + {s}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => goFridge()} className="self-start mt-2 bg-lime text-ink font-extrabold text-lg px-7 py-4.5 rounded-full hover:bg-lime-hi">
          Show what I can make →
        </button>
      </section>

      <section className="px-14 py-18 flex flex-col gap-7">
        <span className="font-mono text-[13px] text-moss tracking-wide">NAME SEARCH</span>
        <h2 className="text-7xl font-extrabold leading-[0.95] tracking-[-0.035em]">Know what you want?</h2>
        <p className="text-lg leading-relaxed text-muted max-w-[460px]">Search every recipe by name. Each result shows its estimated grocery total.</p>
        <form onSubmit={(e) => { e.preventDefault(); goName(); }} className="flex gap-2 bg-white rounded-[20px] p-2 border-[1.5px] border-ink">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Search recipes" className="flex-1 min-w-0 bg-transparent outline-none text-xl px-3.5 py-3" />
          <button className="bg-ink text-paper px-6 rounded-[14px] font-semibold hover:bg-forest">Search</button>
        </form>
        <Link href="/search" className="self-start underline">Browse all recipes →</Link>
      </section>
    </main>
  );
}
