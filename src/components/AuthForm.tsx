"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";

type Mode = "sign-in" | "sign-up";

const COPY = {
  "sign-in": { button: "Sign in", busy: "Signing in…", prompt: "No account?", link: "Sign up", href: "/sign-up" },
  "sign-up": { button: "Create account", busy: "Creating…", prompt: "Already have an account?", link: "Sign in", href: "/sign-in" },
} as const;

/**
 * One-screen username + password form, styled like the rest of the app.
 * Clerk still does the actual auth; this replaces its two-step, white-card widgets.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const signInHook = useSignIn();
  const signUpHook = useSignUp();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = COPY[mode];
  const isLoaded = mode === "sign-in" ? signInHook.isLoaded : signUpHook.isLoaded;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const identifier = username.trim();
      let sessionId: string | null = null;
      let setActive;

      if (mode === "sign-in") {
        if (!signInHook.isLoaded) return;
        const res = await signInHook.signIn.create({ identifier, password });
        if (res.status === "complete") sessionId = res.createdSessionId;
        setActive = signInHook.setActive;
      } else {
        if (!signUpHook.isLoaded) return;
        const res = await signUpHook.signUp.create({ username: identifier, password });
        if (res.status === "complete") sessionId = res.createdSessionId;
        else if (res.missingFields.length)
          setError(`Clerk is asking for: ${res.missingFields.join(", ")}. Turn those off in the Clerk dashboard.`);
        setActive = signUpHook.setActive;
      }

      if (sessionId) {
        await setActive({ session: sessionId });
        router.replace("/");
        router.refresh();
      } else {
        setError((prev) => prev ?? "This account needs an extra step that isn't supported here.");
      }
    } catch (err) {
      const e = err as { errors?: { code?: string; longMessage?: string; message?: string }[] };
      if (e.errors?.[0]?.code === "session_exists") {
        // Already signed in in this browser: just go in.
        router.replace("/");
        router.refresh();
        return;
      }
      setError(e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const input = "kr-field";

  return (
    <form onSubmit={onSubmit} className="kr-panel w-full space-y-5">
      <label className="block text-lg">
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
      <label className="block text-lg">
        Password
        <input
          className={`${input} mt-1.5`}
          type="password"
          name="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="kr-error text-base">{error}</p>}
      <button
        type="submit"
        disabled={!isLoaded || busy}
        className="kr-btn w-full"
      >
        {busy ? copy.busy : `▼ ${copy.button} ▼`}
      </button>
      <p className="text-muted text-center text-base">
        {copy.prompt}{" "}
        <Link href={copy.href} className="text-accent">
          {copy.link}
        </Link>
      </p>
      {/* Clerk's bot protection mounts its captcha here when needed. */}
      <div id="clerk-captcha" />
    </form>
  );
}
