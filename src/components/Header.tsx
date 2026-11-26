import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { Player } from "@/lib/auth";

export function Header({ player }: { player: Player }) {
  return (
    <header className="pt-4 pb-8">
      <div className="flex items-center justify-end gap-4 text-base">
        <Link href={`/players/${encodeURIComponent(player.username)}`} className="kr-btn kr-btn--secondary">
          my log
        </Link>
        {player.is_admin && (
          <Link href="/admin" className="kr-btn kr-btn--secondary">
            admin
          </Link>
        )}
        <UserButton />
      </div>
      <Link href="/" className="mt-4 block text-center">
        <span className="kr-shrimp block" aria-hidden>
          🦐
        </span>
        <span className="kr-wordmark block">krillion</span>
        <span className="kr-tagline mt-2 block">leaderboard</span>
      </Link>
    </header>
  );
}
