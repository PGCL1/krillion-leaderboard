/** One of the player's scores and where it finished that day (a row of the `daily_finish` view). */
export type Finish = { game_number: number; score: number; rank: number; field: number };

/** One game on a player's timeline. `score`/`rank` are null on days they didn't play. */
export type Day = {
  game: number;
  score: number | null;
  /** Finish that day among everyone who played it (competition ranking: 1, 2, 2, 4). */
  rank: number | null;
  /** How many people played that game (null on days they missed). */
  field: number | null;
  /** Running average depth up to and including this game; held flat across missed days. */
  avg: number;
};

export type ProfileStats = {
  /** Every game from the player's first dive to the latest game, missed days included. */
  days: Day[];
  dives: number;
  avg: number | null;
  /** Change in the running average over the last 7 games (null until there's a value 7 games back). */
  avgChange7: number | null;
  deepest: number | null;
  podiums: { 1: number; 2: number; 3: number };
  /** Games in a row played, ending at the latest game. Today not played yet doesn't break it. */
  streak: number;
};

/**
 * Builds a player's profile numbers from their own finishes.
 * `currentGame` is today's game; the timeline runs to whichever is later, today or their latest submission.
 */
export function profileStats(finishes: Finish[], currentGame: number): ProfileStats {
  const finish = new Map(finishes.map((f) => [f.game_number, f]));

  const empty: ProfileStats = { days: [], dives: 0, avg: null, avgChange7: null, deepest: null, podiums: { 1: 0, 2: 0, 3: 0 }, streak: 0 };
  if (finish.size === 0) return empty;

  const games = [...finish.keys()];
  const first = Math.min(...games);
  const last = Math.max(currentGame, ...games);

  const days: Day[] = [];
  const podiums = { 1: 0, 2: 0, 3: 0 };
  let sum = 0;
  let n = 0;
  let deepest = -Infinity;
  for (let g = first; g <= last; g++) {
    const f = finish.get(g);
    if (f) {
      sum += f.score;
      n++;
      deepest = Math.max(deepest, f.score);
      if (f.rank <= 3) podiums[f.rank as 1 | 2 | 3]++;
    }
    days.push({
      game: g,
      score: f?.score ?? null,
      rank: f?.rank ?? null,
      field: f?.field ?? null,
      avg: sum / n,
    });
  }

  const avg = sum / n;
  const weekAgo = days.find((d) => d.game === last - 7);
  let streak = 0;
  let i = days.length - 1;
  if (days[i].score === null && days[i].game >= currentGame) i--; // today isn't over yet
  for (; i >= 0 && days[i].score !== null; i--) streak++;

  return {
    days,
    dives: n,
    avg,
    avgChange7: weekAgo ? avg - weekAgo.avg : null,
    deepest,
    podiums,
    streak,
  };
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return n + (teen ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th");
}
