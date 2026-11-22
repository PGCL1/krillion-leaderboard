import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { Player } from "@/lib/auth";

export function Header({ player }: { player: Player }) {
  return (
    <header className="flex items-center justify-between gap-3 py-4">
      <Link href="/" className="text-lg font-bold tracking-tight">
        🦐 Krillion Leaderboard
      </Link>
      <div className="flex items-center gap-3 text-sm">
        {player.is_admin && (
          <Link href="/admin" className="text-muted hover:text-foreground">
            Admin
          </Link>
        )}
        <UserButton />
      </div>
    </header>
  );
}
