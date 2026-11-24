"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs/legacy";

/** One-screen username + password sign-in (Clerk's built-in <SignIn> asks in two steps). */
export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.create({ identifier: username.trim(), password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
        router.refresh();
      } else {
        setError("This account needs an extra sign-in step that isn't supported here.");
      }
    } catch (err) {
      const e = err as { errors?: { longMessage?: string; message?: string }[] };
      setError(e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-line bg-background px-3 py-2.5 outline-none focus:border-accent";

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4 rounded-2xl border border-line bg-card p-6">
      <label className="block text-sm font-medium">
        Username
        <input
          className={`${input} mt-1.5`}
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          className={`${input} mt-1.5`}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-accent">{error}</p>}
      <button
        type="submit"
        disabled={!isLoaded || busy}
        className="w-full rounded-xl bg-accent py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-muted text-center text-sm">
        No account?{" "}
        <Link href="/sign-up" className="text-accent font-medium">
          Sign up
        </Link>
      </p>
      <div id="clerk-captcha" />
    </form>
  );
}
