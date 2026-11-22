import Link from "next/link";
import { requirePlayer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateForGameNumber, today } from "@/lib/game";
import { withRanks } from "@/lib/rank";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { SubmitForm } from "@/components/SubmitForm";

export const dynamic = "force-dynamic";

const MIN_GAMES = Math.max(1, Number(process.env.MIN_GAMES_FOR_RANKING ?? 3) || 1);

type ScoreRow = {
  score: number;
  player_id: string;
  players: { display_name: string; avatar_url: string | null } | null;
};
type OverallRow = {
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  games_played: number;
  total_score: number;
  avg_score: number | null;
  best_score: number | null;
};

function medal(rank: number) {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : String(rank);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; game?: string }>;
}) {
  const player = await requirePlayer();
  const sp = await searchParams;
  const view = sp.view === "overall" ? "overall" : "daily";
  const current = today();
  const game = Math.min(current.gameNumber, Math.max(1, Number(sp.game) || current.gameNumber));

  const supabase = createAdminClient();
  const { data: mine } = await supabase
    .from("scores")
    .select("score")
    .eq("player_id", player.id)
    .eq("game_number", current.gameNumber)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <Header player={player} />

      {mine ? (
        <div className="rounded-2xl border border-line bg-card p-4 text-sm">
          ✅ You scored <b>{mine.score}</b> on Krillion #{current.gameNumber}. Come back tomorrow!
        </div>
      ) : (
        <SubmitForm gameNumber={current.gameNumber} />
      )}

      <nav className="mt-8 flex gap-1 rounded-full border border-line bg-card p-1 w-fit text-sm">
        {(["daily", "overall"] as const).map((v) => (
          <Link
            key={v}
            href={v === "daily" ? "/" : "/?view=overall"}
            className={`rounded-full px-4 py-1.5 font-medium ${view === v ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
          >
            {v === "daily" ? "Daily" : "Overall"}
          </Link>
        ))}
      </nav>

      {view === "daily" ? (
        <Daily game={game} currentGame={current.gameNumber} meId={player.id} />
      ) : (
        <Overall meId={player.id} />
      )}
    </main>
  );
}

async function Daily({ game, currentGame, meId }: { game: number; currentGame: number; meId: string }) {
  const supabase = createAdminClient();
  const [{ data: scores }, { data: players }] = await Promise.all([
    supabase
      .from("scores")
      .select("score, player_id, players(display_name, avatar_url)")
      .eq("game_number", game)
      .order("score", { ascending: false })
      .order("submitted_at", { ascending: true }),
    supabase.from("players").select("id, display_name, joined_at"),
  ]);
  const rows = withRanks((scores ?? []) as unknown as ScoreRow[], (r) => r.score);
  const played = new Set(rows.map((r) => r.player_id));
  const gameDate = dateForGameNumber(game);
  const waiting = (players ?? []).filter((p) => !played.has(p.id) && p.joined_at.slice(0, 10) <= gameDate);

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Krillion #{game} <span className="text-muted text-sm font-normal">{gameDate}</span>
        </h2>
        <div className="flex gap-2 text-sm">
          <Link href={`/?game=${game - 1}`} className="rounded-full border border-line px-3 py-1 hover:bg-card">
            ← Prev
          </Link>
          {game < currentGame && (
            <Link
              href={game + 1 === currentGame ? "/" : `/?game=${game + 1}`}
              className="rounded-full border border-line px-3 py-1 hover:bg-card"
            >
              Next →
            </Link>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted mt-6">No scores yet for this game.</p>
      ) : (
        <ol className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
          {rows.map((r) => (
            <li key={r.player_id} className={`flex items-center gap-3 px-4 py-3 ${r.player_id === meId ? "bg-accent/10" : ""}`}>
              <span className="w-7 text-center font-semibold tabular-nums">{medal(r.rank)}</span>
              <Avatar src={r.players?.avatar_url ?? null} name={r.players?.display_name ?? "?"} />
              <span className="flex-1 truncate">{r.players?.display_name}</span>
              <span className="font-mono text-lg font-bold tabular-nums">{r.score}</span>
            </li>
          ))}
        </ol>
      )}

      {game === currentGame && waiting.length > 0 && (
        <p className="text-muted mt-4 text-sm">
          Still to play: {waiting.map((p) => p.display_name).join(", ")}
        </p>
      )}
    </section>
  );
}

async function Overall({ meId }: { meId: string }) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("overall_leaderboard").select("*");
  const all = ((data ?? []) as OverallRow[]).filter((r) => r.games_played > 0);
  const sort = (a: OverallRow, b: OverallRow) =>
    (b.avg_score ?? 0) - (a.avg_score ?? 0) || b.games_played - a.games_played;
  const ranked = withRanks(all.filter((r) => r.games_played >= MIN_GAMES).sort(sort), (r) => r.avg_score ?? 0);
  const provisional = all.filter((r) => r.games_played < MIN_GAMES).sort(sort);

  const Row = ({ r, rank }: { r: OverallRow; rank?: number }) => (
    <li className={`flex items-center gap-3 px-4 py-3 ${r.player_id === meId ? "bg-accent/10" : ""}`}>
      <span className="w-7 text-center font-semibold tabular-nums">{rank ? medal(rank) : "–"}</span>
      <Avatar src={r.avatar_url} name={r.display_name} />
      <span className="flex-1 truncate">{r.display_name}</span>
      <span className="text-muted text-xs tabular-nums text-right w-20">
        {r.games_played} {r.games_played === 1 ? "game" : "games"}
        <br />
        best {r.best_score}
      </span>
      <span className="font-mono text-lg font-bold tabular-nums w-16 text-right">{r.avg_score?.toFixed(1)}</span>
    </li>
  );

  return (
    <section className="mt-4">
      <h2 className="text-xl font-bold">Overall</h2>
      <p className="text-muted text-sm">Average score per game played. Missed days don&apos;t count against you.</p>
      {ranked.length === 0 ? (
        <p className="text-muted mt-6">Nobody has {MIN_GAMES} games yet.</p>
      ) : (
        <ol className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
          {ranked.map((r) => (
            <Row key={r.player_id} r={r} rank={r.rank} />
          ))}
        </ol>
      )}
      {provisional.length > 0 && (
        <>
          <h3 className="mt-6 font-semibold">
            Provisional <span className="text-muted text-sm font-normal">· fewer than {MIN_GAMES} games</span>
          </h3>
          <ol className="mt-2 divide-y divide-line rounded-2xl border border-line bg-card">
            {provisional.map((r) => (
              <Row key={r.player_id} r={r} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
