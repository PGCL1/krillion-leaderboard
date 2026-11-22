import { SignOutButton } from "@clerk/nextjs";

export default function NotInvited() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm place-items-center px-4">
      <div className="text-center">
        <div className="text-5xl">🦑</div>
        <h1 className="mt-3 text-2xl font-bold">Invite only</h1>
        <p className="text-muted mt-2 text-sm">
          You&apos;re signed in, but you&apos;re not on the list yet. Ask someone in the group for an invite link, then open
          it.
        </p>
        <div className="mt-6">
          <SignOutButton redirectUrl="/sign-in">
            <button className="text-sm underline">Sign out</button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
