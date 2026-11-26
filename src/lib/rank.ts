/** Players need this many games before they get a place on the overall board (else "provisional"). */
export const MIN_GAMES = Math.max(1, Number(process.env.MIN_GAMES_FOR_RANKING ?? 3) || 1);

/** Standard competition ranking (1, 2, 2, 4) on an already-sorted list. */
export function withRanks<T>(rows: T[], key: (r: T) => number): (T & { rank: number })[] {
  let rank = 0;
  let prev: number | undefined;
  return rows.map((r, i) => {
    const v = key(r);
    if (v !== prev) rank = i + 1;
    prev = v;
    return { ...r, rank };
  });
}
