import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AuthForm } from "@/components/AuthForm";

export default async function SignUpPage() {
  // Already signed in (e.g. right after signing up): skip the form.
  if ((await auth()).userId) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-10 px-4 py-10">
      <div className="text-center">
        <div className="kr-shrimp">🦐</div>
        <h1 className="kr-wordmark">krillion</h1>
        <div className="kr-tagline mt-2">leaderboard</div>
        <p className="text-muted mt-6 text-base tracking-[0.1em]">Pick a username and password to create your account.</p>
      </div>
      <AuthForm mode="sign-up" />
    </main>
  );
}
