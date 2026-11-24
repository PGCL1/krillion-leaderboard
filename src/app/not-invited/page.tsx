import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isPlayer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NotInvited() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (await isPlayer(userId)) redirect("/");
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm place-items-center px-4">
      <div className="text-center">
        <div className="kr-shrimp">🦑</div>
        <h1 className="kr-wordmark text-[56px]">invite only</h1>
        <p className="text-muted mt-4 text-base">
          You&apos;re signed in, but you&apos;re not on the list yet. Ask someone in the group for an invite link, then open
          it.
        </p>
        <div className="mt-6">
          <SignOutButton redirectUrl="/sign-in">
            <button className="kr-btn kr-btn--secondary">sign out</button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
