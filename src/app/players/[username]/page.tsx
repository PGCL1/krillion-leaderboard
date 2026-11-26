import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateForGameNumber, today } from "@/lib/game";
import { MIN_GAMES, withRanks } from "@/lib/rank";
import { ordinal, profileStats, type Finish } from "@/lib/stats";
import { recentFeedback } from "@/lib/feedback";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { DiveChart } from "@/components/DiveChart";
import { FeedbackBottle } from "@/components/FeedbackBottle";

export const dynamic = "force-dynamic";

const RECENT = 7;

type OverallRow = { player_id: string; games_played: number; avg_score: number | null };

/** A player's log: average depth over time, each day's finish, and their last few dives. Real scores only. */
export default async function PlayerLog({ params }: { params: Promise<{ username: string }> }) {
  const me = await requirePlayer();
  const username = decodeURIComponent((await params).username).toLowerCase();
  const supabase = createAdminClient();

  const [{ data: who }, { data: finishes }, { data: overall }, myBottles] = await Promise.all([
    supabase.from("players").select("username, display_name, avatar_url").eq("username", username).maybeSingle(),
    supabase.from("daily_finish").select("game_number, score, rank, field").eq("player_id", username).order("game_number"),
    supabase.from("overall_leaderboard").select("player_id, games_played, avg_score"),
    recentFeedback(me.username),
  ]);
  if (!who) notFound();

  const current = today().gameNumber;
  const st = profileStats((finishes ?? []) as Finish[], current);
  const days = st.days.map((d) => ({ ...d, date: dateForGameNumber(d.game) }));

  const ranked = withRanks(
    ((overall ?? []) as OverallRow[])
      .filter((r) => r.games_played >= MIN_GAMES)
      .sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0) || b.games_played - a.games_played),
    (r) => r.avg_score ?? 0,
  );
  const crewRank = ranked.find((r) => r.player_id === username)?.rank ?? null;
  const isMe = username === me.username;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <Header player={me} />

      <Link href="/" className="kr-btn kr-btn--secondary">
        ◀ leaderboard
      </Link>

      <section className="kr-panel mt-8 grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar src={who.avatar_url} name={who.display_name} size={40} />
            <div className="min-w-0">
              <h1 className="truncate text-4xl leading-none">
                {who.display_name} {isMe && <span className="kr-tag kr-tag--pink">you</span>}
              </h1>
              <p className="text-muted text-base">avg depth per dive, all time</p>
            </div>
          </div>
          {st.avg !== null && (
            <div className="text-right">
              <span className="kr-big">{st.avg.toFixed(1)}</span>
              {st.avgChange7 !== null && (
                <span className="text-muted ml-2 text-xl" title="change over the last 7 games; ▼ = deeper">
                  {st.avgChange7 >= 0 ? "▼" : "▲"} {Math.abs(st.avgChange7).toFixed(1)} <span className="text-base">7d</span>
                </span>
              )}
            </div>
          )}
        </div>

        {days.length === 0 ? (
          <p className="text-muted py-8 text-center">
            {isMe ? "no dives yet. paste today's share text on the leaderboard to start your log." : "no dives yet."}
          </p>
        ) : (
          <>
            <DiveChart days={days} />
            <div className="kr-legend">
              <span><i style={{ background: "var(--tier-krillion)" }} />1st</span>
              <span><i style={{ background: "var(--tier-deepcut)" }} />2nd</span>
              <span><i style={{ background: "var(--tier-schooler)" }} />3rd</span>
              <span>
                <i style={{ background: "linear-gradient(90deg, rgb(143 163 196 / 0.35), var(--tier-plankton))" }} />
                4th+ · brighter = deeper
              </span>
              <span><i style={{ background: "var(--tier-miss)", height: 2, verticalAlign: 4 }} />missed</span>
            </div>
            <dl className="kr-stats kr-board">
              <div>
                <dt>deepest</dt>
                <dd>{st.deepest}</dd>
              </div>
              <div>
                <dt>crew rank</dt>
                <dd>
                  {crewRank ? (
                    <>
                      #{crewRank}
                      <small>/{ranked.length}</small>
                    </>
                  ) : (
                    <small>provisional</small>
                  )}
                </dd>
              </div>
              <div>
                <dt>podiums</dt>
                <dd className="flex justify-center gap-3">
                  <span style={{ color: "var(--tier-krillion)" }} title="1st">{st.podiums[1]}</span>
                  <span style={{ color: "var(--tier-deepcut)" }} title="2nd">{st.podiums[2]}</span>
                  <span style={{ color: "var(--tier-schooler)" }} title="3rd">{st.podiums[3]}</span>
                </dd>
              </div>
              <div>
                <dt>streak</dt>
                <dd>
                  {st.streak}
                  <small>d</small>
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

      {days.length > 0 && (
        <section className="mt-12">
          <h2 className="text-4xl leading-none">recent dives</h2>
          <p className="text-muted mt-1 text-base tracking-[0.1em]">
            {st.dives} {st.dives === 1 ? "dive" : "dives"} since #{days[0].game}
          </p>
          <ol className="kr-board mt-6">
            {days
              .slice(-RECENT)
              .reverse()
              .map((d) => (
                <li
                  key={d.game}
                  data-rank={d.rank ?? undefined}
                  className={`kr-row kr-row--log ${d.score === null ? "kr-row--miss" : ""}`}
                >
                  <span className="text-muted">#{d.game}</span>
                  <span className="kr-row__name text-muted">{d.date}</span>
                  {d.score === null ? (
                    <span>{d.game >= current ? "not yet" : "missed"}</span>
                  ) : (
                    <span className="kr-row__rank">
                      {ordinal(d.rank!)} <span className="kr-row__meta">of {d.field}</span>
                    </span>
                  )}
                  <span className="kr-row__score">{d.score ?? "–"}</span>
                </li>
              ))}
          </ol>
        </section>
      )}

      <FeedbackBottle name={me.display_name} recent={myBottles} />
    </main>
  );
}
