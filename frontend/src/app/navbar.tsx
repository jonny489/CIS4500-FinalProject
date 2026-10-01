"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? session?.user?.email ?? "";
  const initials = name.split(/[\s@]/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="h-16 px-8 flex items-center justify-between bg-ink text-paper">
      <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
        <span className="size-3.5 rounded-full bg-lime" />
        Recipe Search
      </Link>
      <nav className="flex items-center gap-2 text-[15px]">
        <Link href="/search" className="px-3.5 py-2 rounded-full hover:bg-forest-3">Browse all</Link>
        {session?.user ? (
          <>
            <Link href="/saved" className="px-3.5 py-2 rounded-full hover:bg-forest-3">Saved</Link>
            <div className="flex items-center gap-2.5 ml-2 pl-4 border-l border-forest-2">
              <span title={session.user.email ?? undefined} className="size-8 rounded-full bg-forest-2 grid place-items-center text-xs font-semibold">
                {initials}
              </span>
              <button onClick={() => signOut()} className="text-sm text-sage hover:text-paper">Sign out</button>
            </div>
          </>
        ) : (
          <Link href="/login" className="ml-2 px-[18px] py-2 rounded-full bg-lime text-ink font-bold hover:bg-lime-hi">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
