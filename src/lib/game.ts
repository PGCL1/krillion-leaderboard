/**
 * Krillion puzzle numbering. Configure one known (game number, date) pair and
 * the timezone the daily puzzle resets in; everything else is derived.
 *
 *   KRILLION_REFERENCE_GAME=129
 *   KRILLION_REFERENCE_DATE=2026-11-22
 *   KRILLION_TIMEZONE=America/Toronto
 */

export function gameConfig() {
  const refGame = Number(process.env.KRILLION_REFERENCE_GAME);
  const refDate = process.env.KRILLION_REFERENCE_DATE ?? "";
  const timeZone = process.env.KRILLION_TIMEZONE || "UTC";
  if (!Number.isInteger(refGame) || !/^\d{4}-\d{2}-\d{2}$/.test(refDate)) {
    throw new Error("Set KRILLION_REFERENCE_GAME and KRILLION_REFERENCE_DATE (YYYY-MM-DD).");
  }
  return { refGame, refDate, timeZone };
}

/** YYYY-MM-DD for `now` in the given IANA timezone. */
export function localDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function gameNumberForDate(isoDate: string, cfg = gameConfig()): number {
  return cfg.refGame + (dayIndex(isoDate) - dayIndex(cfg.refDate));
}

export function dateForGameNumber(game: number, cfg = gameConfig()): string {
  const ms = (dayIndex(cfg.refDate) + (game - cfg.refGame)) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function today(now = new Date(), cfg = gameConfig()) {
  const date = localDate(now, cfg.timeZone);
  return { date, gameNumber: gameNumberForDate(date, cfg) };
}
