import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <div className="text-5xl">🦐</div>
        <h1 className="mt-3 text-2xl font-bold">Krillion Leaderboard</h1>
      </div>
      <SignUp forceRedirectUrl="/" signInForceRedirectUrl="/" />
    </main>
  );
}
