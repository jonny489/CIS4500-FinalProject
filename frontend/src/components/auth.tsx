"use client";

import Link from "next/link";

/** Shared split layout for /login and /signup. */
export function AuthShell({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 grid grid-cols-2 min-h-[calc(100vh-4rem)]">
      <section className="bg-forest text-paper px-14 py-18 flex flex-col gap-6 justify-center">
        <span className="font-mono text-[13px] text-lime tracking-wide">YOUR ACCOUNT</span>
        <h1 className="text-[64px] font-extrabold leading-[0.95] tracking-[-0.035em] max-w-[520px]">{title}</h1>
        <p className="text-lg leading-relaxed text-sage max-w-[440px]">{blurb}</p>
      </section>
      <section className="px-14 py-18 flex items-center">
        <div className="w-full max-w-[400px] flex flex-col gap-5">{children}</div>
      </section>
    </main>
  );
}

export function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="flex flex-col gap-2">
      <span className="font-semibold text-[15px]">{label}</span>
      <input {...rest} className="text-[17px] px-4 py-3.5 border-[1.5px] border-line rounded-[14px] bg-white focus:border-ink outline-none" />
    </label>
  );
}

export function AuthError({ error }: { error: string | null }) {
  if (!error) return null;
  return <p role="alert" className="bg-danger-soft text-[#8a3720] rounded-xl px-3.5 py-3 text-[15px]">{error}</p>;
}

export const primaryBtn = "w-full py-4 rounded-full bg-lime text-ink font-extrabold text-[17px] hover:bg-lime-hi disabled:opacity-60";
export const AltLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="underline text-ink font-semibold">{children}</Link>
);
