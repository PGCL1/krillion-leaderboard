"use client";

import { useState } from "react";
import Link from "next/link";
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
export function AuthForm({ mode, invited = false }: { mode: Mode; invited?: boolean }) {
  const signInHook = useSignIn();
  const signUpHook = useSignUp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = COPY[mode];
  const isLoaded = mode === "sign-in" ? signInHook.isLoaded : signUpHook.isLoaded;

  /**
   * Leave with a full page load once the session is set. Clerk's provider already runs its own
   * router.refresh() on the current route (/sign-in or /sign-up) right after setActive; a client-side
   * router.replace("/") racing that refresh could leave the form on screen with the session already
   * created, so the user had to click a second time. A full load has no race, and the server renders "/"
   * with the new session cookie (onboarding via the invite cookie happens there).
   */
  function goHome() {
    window.location.assign("/");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !isLoaded) return;
    setBusy(true);
    setError(null);
    let leaving = false;
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
        leaving = true;
        goHome();
      } else {
        setError((prev) => prev ?? "This account needs an extra step that isn't supported here.");
      }
    } catch (err) {
      const e = err as { errors?: { code?: string; longMessage?: string; message?: string }[] };
      if (e.errors?.[0]?.code === "session_exists") {
        // Already signed in in this browser: just go in.
        leaving = true;
        goHome();
        return;
      }
      setError(e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? "Something went wrong. Please try again.");
    } finally {
      // Stay busy while the page navigates away, so the button can't be pressed again.
      if (!leaving) setBusy(false);
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
        {busy ? copy.busy : !isLoaded ? "loading…" : `▼ ${copy.button} ▼`}
      </button>
      <p className="text-muted text-center text-base">
        {copy.prompt}{" "}
        <Link href={invited ? `${copy.href}?invited=1` : copy.href} className="text-accent">
          {copy.link}
        </Link>
      </p>
      {/* Clerk's bot protection mounts its captcha here when needed. */}
      <div id="clerk-captcha" />
    </form>
  );
}
