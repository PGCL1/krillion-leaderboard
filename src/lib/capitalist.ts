/**
 * "yuki capitalist" scoring (the group's name for it).
 *
 * Every daily dive pays its podium on top of the real score: 1st +50, 2nd +20, 3rd +10.
 * - Ties share a place, standard competition ranking (1, 2, 2, 4): both 2nds get +20, nobody is 3rd.
 * - The podium is decided by scores submitted before the cutoff (17:30 in KRILLION_TIMEZONE on the
 *   dive's day). Later scores still count as real scores, but can't take loot.
 * - Before the cutoff, today's payout is provisional.
 * - A quiet day pays out like any other.
 * - Overall = the sum of every daily (score + loot). No averages, no minimum dives.
 */
import { withRanks } from "./rank";

export const BONUS: Record<number, number> = { 1: 50, 2: 20, 3: 10 };

/** "HH:MM", local to KRILLION_TIMEZONE. */
export function cutoffTime(): string {
  const v = process.env.CAPITALIST_CUTOFF ?? "17:30";
  return /^\d{2}:\d{2}$/.test(v) ? v : "17:30";
}

/** "YYYY-MM-DDTHH:MM" for an instant, in the given timezone. Sorts as a string. */
export function localStamp(instant: Date, timeZone: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export type DiveScore = { player_id: string; score: number; submitted_at: string };
export type Payout<T> = T & { bonus: number; late: boolean; total: number };

/**
 * Loot for one dive. `gameDate` is the dive's local date (YYYY-MM-DD).
 * A score is "late" when submitted at or after the cutoff on that date (or any later day).
 */
export function payDive<T extends DiveScore>(
  rows: T[],
  gameDate: string,
  timeZone: string,
  cutoff = cutoffTime(),
): Payout<T>[] {
  const deadline = `${gameDate}T${cutoff}`;
  const isLate = (r: T) => localStamp(new Date(r.submitted_at), timeZone) >= deadline;
  const onTime = rows.filter((r) => !isLate(r)).sort((a, b) => b.score - a.score);
  const bonusOf = new Map(withRanks(onTime, (r) => r.score).map((r) => [r.player_id, BONUS[r.rank] ?? 0]));
  return rows.map((r) => {
    const late = isLate(r);
    const bonus = late ? 0 : (bonusOf.get(r.player_id) ?? 0);
    return { ...r, bonus, late, total: r.score + bonus };
  });
}

/** True while today's podium can still change. */
export function isProvisional(gameDate: string, timeZone: string, now = new Date(), cutoff = cutoffTime()): boolean {
  return localStamp(now, timeZone) < `${gameDate}T${cutoff}`;
}
