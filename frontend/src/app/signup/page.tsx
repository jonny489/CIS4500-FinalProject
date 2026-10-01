"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AltLink, AuthError, AuthShell, Field, primaryBtn } from "@/components/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 6) return setError("Password needs at least 6 characters.");
    setLoading(true);
    setError(null);
    try {
      // Same-origin route: the backend's /auth routes only accept the Next.js server.
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? "Signup failed");
        return setLoading(false);
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Account created but sign-in failed. Try signing in.");
        setLoading(false);
      } else router.push("/");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Make an account in a minute." blurb="Your saved recipes follow you to any device you sign in on.">
      <h2 className="text-[40px] font-extrabold tracking-[-0.03em]">Create account</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sam Rivera" />
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field label="Password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        <AuthError error={error} />
        <button type="submit" disabled={loading} className={primaryBtn}>{loading ? "Creating account…" : "Create account"}</button>
      </form>
      <p className="text-[15px] text-muted">Already have an account? <AltLink href="/login">Sign in</AltLink></p>
    </AuthShell>
  );
}
