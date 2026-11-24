import Link from "next/link";
import { requirePlayer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateForGameNumber, gameConfig, today } from "@/lib/game";
import { withRanks } from "@/lib/rank";
import { cutoffTime, isProvisional, payDive, type Payout } from "@/lib/capitalist";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { SubmitForm } from "@/components/SubmitForm";

export const dynamic = "force-dynamic";

const MIN_GAMES = Math.max(1, Number(process.env.MIN_GAMES_FOR_RANKING ?? 3) || 1);

type Mode = "real" | "cap";
type PlayerInfo = { display_name: string; avatar_url: string | null } | null;
type ScoreRow = {
  score: number;
  player_id: string;
  submitted_at: string;
  players: PlayerInfo;
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

/** Builds a home-page link, keeping the other settings. */
function homeHref(p: { mode: Mode; game?: number }) {
  const q = new URLSearchParams();
  if (p.mode === "cap") q.set("mode", "cap");
  if (p.game !== undefined) q.set("game", String(p.game));
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; mode?: string }>;
}) {
  const player = await requirePlayer();
  const sp = await searchParams;
  const mode: Mode = sp.mode === "cap" ? "cap" : "real";
  const current = today();
  const game = Math.min(current.gameNumber, Math.max(1, Number(sp.game) || current.gameNumber));
  const gameParam = game === current.gameNumber ? undefined : game;

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

      {/* Today's status: the submit panel until you've played, then a one-line "see you tomorrow". */}
      <div className="mt-2">
        {mine ? (
          <div className="kr-done">
            <span className="kr-shrimp" aria-hidden>🦐</span>
            <span>
              you surfaced with <span className="kr-done__score">{mine.score}</span>
            </span>
            <span className="kr-done__meta">see you tomorrow · dive #{current.gameNumber + 1}</span>
          </div>
        ) : (
          <SubmitForm gameNumber={current.gameNumber} />
        )}
      </div>

      {/* One switch for both tables: real scores, or yuki capitalist (score + podium loot). */}
      <nav className="mt-10 flex flex-wrap items-center gap-4" aria-label="scoring">
        <Link
          href={homeHref({ mode: "real", game: gameParam })}
          aria-current={mode === "real"}
          className="kr-btn kr-btn--secondary"
        >
          real
        </Link>
        <Link
          href={homeHref({ mode: "cap", game: gameParam })}
          aria-current={mode === "cap"}
          className="kr-btn kr-btn--secondary kr-btn--cap"
        >
          yuki capitalist 💸
        </Link>
      </nav>

      {/* Daily table first, overall table under it. */}
      <div className={mode === "cap" ? "kr-nasty" : undefined}>
        {mode === "cap" ? (
          <>
            <DailyCap game={game} currentGame={current.gameNumber} meId={player.id} />
            <OverallCap meId={player.id} />
          </>
        ) : (
          <>
            <Daily game={game} currentGame={current.gameNumber} meId={player.id} />
            <Overall meId={player.id} />
          </>
        )}
      </div>
    </main>
  );
}

function DiveHeader({ game, currentGame, mode, note }: { game: number; currentGame: number; mode: Mode; note?: string }) {
  const gameDate = dateForGameNumber(game);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h2 className="kr-h text-4xl leading-none">
        dive #{game} {game === currentGame && <span className="kr-tag">today</span>}
        <span className="kr-sub block text-base tracking-[0.14em]">
          {gameDate}
          {note ? ` · ${note}` : ""}
        </span>
      </h2>
      <div className="flex gap-4">
        <Link href={homeHref({ mode, game: game - 1 })} className="kr-btn kr-btn--secondary">
          ◀ prev
        </Link>
        {game < currentGame && (
          <Link
            href={homeHref({ mode, game: game + 1 === currentGame ? undefined : game + 1 })}
            className="kr-btn kr-btn--secondary"
          >
            next ▶
          </Link>
        )}
      </div>
    </div>
  );
}

const you = (id: string, meId: string) => id === meId && <span className="kr-tag kr-tag--pink">you</span>;

async function Daily({ game, currentGame, meId }: { game: number; currentGame: number; meId: string }) {
  const supabase = createAdminClient();
  const [{ data: scores }, { data: players }] = await Promise.all([
    supabase
      .from("scores")
      .select("score, player_id, submitted_at, players(display_name, avatar_url)")
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
    <section className="mt-8">
      <DiveHeader game={game} currentGame={currentGame} mode="real" />

      {rows.length === 0 ? (
        <p className="text-muted mt-6">nobody has surfaced from this dive yet.</p>
      ) : (
        <ol className="kr-board mt-6">
          {rows.map((r) => (
            <li key={r.player_id} data-rank={r.rank} className={`kr-row ${r.player_id === meId ? "kr-row--me" : ""}`}>
              <span className="kr-row__rank">{r.rank}</span>
              <Avatar src={r.players?.avatar_url ?? null} name={r.players?.display_name ?? "?"} />
              <span className="kr-row__name">
                {r.players?.display_name} {you(r.player_id, meId)}
              </span>
              <span className="kr-row__score">{r.score}</span>
            </li>
          ))}
        </ol>
      )}

      {game === currentGame && waiting.length > 0 && (
        <p className="text-muted mt-5 text-base tracking-[0.1em]">
          still diving · {waiting.map((p) => p.display_name).join(" · ")}
        </p>
      )}
    </section>
  );
}

function Loot({ r }: { r: { bonus: number; late: boolean } }) {
  if (r.bonus === 50) return <span className="kr-loot kr-loot--gold">+50 💰</span>;
  if (r.bonus === 20) return <span className="kr-loot kr-loot--orange">+20 💸</span>;
  if (r.bonus === 10) return <span className="kr-loot kr-loot--red">+10</span>;
  return <span className="kr-loot kr-loot--red">{r.late ? "too late" : "taxed"}</span>;
}

async function DailyCap({ game, currentGame, meId }: { game: number; currentGame: number; meId: string }) {
  const { timeZone } = gameConfig();
  const gameDate = dateForGameNumber(game);
  const { data: scores } = await createAdminClient()
    .from("scores")
    .select("score, player_id, submitted_at, players(display_name, avatar_url)")
    .eq("game_number", game);

  const paid = payDive((scores ?? []) as unknown as ScoreRow[], gameDate, timeZone);
  const rows = withRanks(
    paid.sort((a, b) => b.total - a.total || b.score - a.score),
    (r) => r.total,
  );
  const provisional = game === currentGame && isProvisional(gameDate, timeZone);
  const winners = rows.filter((r) => r.bonus > 0);
  const losers = rows.filter((r) => r.bonus === 0);

  return (
    <section className="mt-8">
      {rows.length > 0 && (
        <div className="kr-ticker" aria-hidden>
          <span>
            payout · dive #{game} ·{" "}
            {winners.map((r) => `${r.players?.display_name} +${r.bonus}${r.bonus === 50 ? " 💰" : " 💸"}`).join(" · ")}
            {" · the house takes the rest · "}
            {losers.length > 0 && `${losers.map((r) => r.players?.display_name).join(" · ")} taxed · `}
          </span>
        </div>
      )}
      <DiveHeader
        game={game}
        currentGame={currentGame}
        mode="cap"
        note={provisional ? `payout provisional until ${cutoffTime()}` : "payout final"}
      />

      {rows.length === 0 ? (
        <p className="kr-sub mt-6">no loot on this dive. nobody surfaced.</p>
      ) : (
        <ol className="kr-board mt-6">
          {rows.map((r) => (
            <li key={r.player_id} data-rank={r.rank} className={`kr-row ${r.player_id === meId ? "kr-row--me" : ""}`}>
              <span className="kr-row__rank">{r.rank}</span>
              <Avatar src={r.players?.avatar_url ?? null} name={r.players?.display_name ?? "?"} />
              <span className="kr-row__name">
                {r.players?.display_name} {you(r.player_id, meId)} <Loot r={r} />
              </span>
              <span className="kr-row__score">{r.total}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="kr-stub mt-5">
        <span>podium decided at {cutoffTime()} · later dives don&apos;t get loot</span>
        <b>{rows.reduce((a, r) => a + r.bonus, 0)} loot paid 💸</b>
      </p>
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
    <li data-rank={rank} className={`kr-row ${r.player_id === meId ? "kr-row--me" : ""}`}>
      <span className="kr-row__rank">{rank ?? "·"}</span>
      <Avatar src={r.avatar_url} name={r.display_name} />
      <span className="kr-row__name">
        {r.display_name}
        <span className="kr-row__meta">
          {r.games_played} {r.games_played === 1 ? "dive" : "dives"} · best {r.best_score}
        </span>
      </span>
      <span className="kr-row__score">{r.avg_score?.toFixed(1)}</span>
    </li>
  );

  return (
    <section className="mt-16">
      <h2 className="text-4xl leading-none">overall</h2>
      <p className="text-muted mt-1 text-base tracking-[0.1em]">average per dive played · missed days don&apos;t count</p>
      {ranked.length === 0 ? (
        <p className="text-muted mt-6">nobody has {MIN_GAMES} dives yet.</p>
      ) : (
        <ol className="kr-board mt-6">
          {ranked.map((r) => (
            <Row key={r.player_id} r={r} rank={r.rank} />
          ))}
        </ol>
      )}
      {provisional.length > 0 && (
        <>
          <h3 className="mt-8 text-2xl">
            provisional <span className="text-muted text-base">· fewer than {MIN_GAMES} dives</span>
          </h3>
          <ol className="kr-board mt-4">
            {provisional.map((r) => (
              <Row key={r.player_id} r={r} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

type Haul = {
  player_id: string;
  players: PlayerInfo;
  dives: number;
  haul: number;
  loot: number;
  gold: number;
  silver: number;
  bronze: number;
};

async function OverallCap({ meId }: { meId: string }) {
  const { timeZone } = gameConfig();
  const { data } = await createAdminClient()
    .from("scores")
    .select("score, player_id, submitted_at, game_number, players(display_name, avatar_url)");
  const scores = (data ?? []) as unknown as (ScoreRow & { game_number: number })[];

  // Pay out every dive, then add up each player's daily (score + loot).
  const byGame = new Map<number, typeof scores>();
  for (const s of scores) byGame.set(s.game_number, [...(byGame.get(s.game_number) ?? []), s]);
  const hauls = new Map<string, Haul>();
  for (const [game, rows] of byGame) {
    for (const r of payDive(rows, dateForGameNumber(game), timeZone) as Payout<ScoreRow>[]) {
      const h = hauls.get(r.player_id) ?? {
        player_id: r.player_id,
        players: r.players,
        dives: 0,
        haul: 0,
        loot: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
      };
      h.dives++;
      h.haul += r.total;
      h.loot += r.bonus;
      if (r.bonus === 50) h.gold++;
      else if (r.bonus === 20) h.silver++;
      else if (r.bonus === 10) h.bronze++;
      hauls.set(r.player_id, h);
    }
  }
  const ranked = withRanks(
    [...hauls.values()].sort((a, b) => b.haul - a.haul),
    (h) => h.haul,
  );
  const broke = ranked.filter((h) => h.loot === 0);

  return (
    <section className="mt-16">
      <h2 className="kr-h text-4xl leading-none">overall haul 🤑</h2>
      <p className="kr-sub mt-1 text-base tracking-[0.1em]">every dive&apos;s score + loot, added up · no averages</p>
      {ranked.length === 0 ? (
        <p className="kr-sub mt-6">the vault is empty.</p>
      ) : (
        <ol className="kr-board mt-6">
          {ranked.map((h) => (
            <li key={h.player_id} data-rank={h.rank} className={`kr-row ${h.player_id === meId ? "kr-row--me" : ""}`}>
              <span className="kr-row__rank">{h.rank}</span>
              <Avatar src={h.players?.avatar_url ?? null} name={h.players?.display_name ?? "?"} />
              <span className="kr-row__name">
                {h.players?.display_name} {you(h.player_id, meId)}
                <span className="kr-row__meta">
                  {h.dives} {h.dives === 1 ? "dive" : "dives"}
                  {h.gold > 0 && <span className="kr-tally--gold"> · 💰×{h.gold}</span>}
                  {h.silver > 0 && <span className="kr-tally--orange"> 💸×{h.silver}</span>}
                  {h.bronze > 0 && <span className="kr-tally--red"> +10×{h.bronze}</span>}
                </span>
              </span>
              <span className="kr-row__score">{h.haul}</span>
            </li>
          ))}
        </ol>
      )}
      {broke.length > 0 && (
        <p className="kr-sub mt-4 text-base tracking-[0.1em]">
          bankrupt · {broke.map((h) => h.players?.display_name).join(" · ")} 💸
        </p>
      )}
      <p className="kr-stub mt-5">
        <span>the house always wins</span>
        <b>{ranked.reduce((a, h) => a + h.loot, 0)} loot in the vault</b>
      </p>
    </section>
  );
}
