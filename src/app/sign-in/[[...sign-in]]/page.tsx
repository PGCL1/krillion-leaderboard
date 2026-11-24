import { SignInForm } from "@/components/SignInForm";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ invited?: string }> }) {
  const { invited } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <div className="text-5xl">🦐</div>
        <h1 className="mt-3 text-2xl font-bold">Krillion Leaderboard</h1>
        <p className="text-muted mt-2 text-sm">
          {invited ? "You've been invited! Sign in to join." : "Sign in to see the leaderboard and submit your daily score."}
        </p>
      </div>
      <SignInForm />
    </main>
  );
}
