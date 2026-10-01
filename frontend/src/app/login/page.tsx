"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AltLink, AuthError, AuthShell, Field, primaryBtn } from "@/components/auth";
import { safeCallbackUrl } from "@/lib/safe-redirect";

const REASONS: Record<string, string> = {
  save: "Sign in to save recipes.",
  saved: "Sign in to see your saved recipes.",
};

export default function LoginPage() {
  return <Suspense><Login /></Suspense>;
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));
  const reason = REASONS[params.get("reason") ?? ""];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "creds" | "google" | "github">(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("creds");
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Invalid email or password");
      setBusy(null);
    } else router.push(callbackUrl);
  }

  const oauth = (p: "google" | "github") => { setBusy(p); signIn(p, { callbackUrl }); };

  return (
    <AuthShell title="Keep the recipes worth cooking again." blurb="Sign in to save recipes and come back to them from any device.">
      <h2 className="text-[40px] font-extrabold tracking-[-0.03em]">Sign in</h2>
      {reason && <p className="bg-lime-soft rounded-xl px-3.5 py-3 text-[15px]">{reason}</p>}
      <div className="flex flex-col gap-2.5">
        <button onClick={() => oauth("google")} disabled={!!busy} className="py-4 rounded-[14px] bg-white border-[1.5px] border-line font-semibold hover:border-ink">
          {busy === "google" ? "Connecting…" : "Continue with Google"}
        </button>
        <button onClick={() => oauth("github")} disabled={!!busy} className="py-4 rounded-[14px] bg-ink text-paper font-semibold hover:bg-forest">
          {busy === "github" ? "Connecting…" : "Continue with GitHub"}
        </button>
      </div>
      <div className="flex items-center gap-3 text-faint text-sm">
        <span className="flex-1 h-px bg-line" />or with email<span className="flex-1 h-px bg-line" />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <AuthError error={error} />
        <button type="submit" disabled={!!busy} className={primaryBtn}>{busy === "creds" ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="text-[15px] text-muted">New here? <AltLink href="/signup">Create an account</AltLink></p>
    </AuthShell>
  );
}
