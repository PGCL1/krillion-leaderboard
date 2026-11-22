export type ParsedScore = {
  gameNumber: number;
  score: number;
  grid: string;
};

export type ParseResult =
  | { ok: true; value: ParsedScore }
  | { ok: false; error: string };

const MAX_SCORE = 1_000_000; // sanity bound only

/**
 * Parses Krillion share text, e.g.
 *
 *   Krillion #129 🦐
 *   180
 *
 *   🦑⬛⬛🐟🐟🦑⬛
 */
export function parseKrillion(raw: string): ParseResult {
  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim());

  const headerIdx = lines.findIndex((l) => /^krillion\s*#\s*\d+/i.test(l));
  if (headerIdx === -1) {
    return { ok: false, error: "Couldn't find a “Krillion #…” line. Paste the share text exactly as Krillion gives it." };
  }
  const gameNumber = Number(lines[headerIdx].match(/#\s*(\d+)/)![1]);

  const rest = lines.slice(headerIdx + 1);
  const scoreIdx = rest.findIndex((l) => l !== "");
  const scoreLine = scoreIdx === -1 ? "" : rest[scoreIdx];
  const m = scoreLine.match(/^(-?\d[\d,]*)$/);
  if (!m) {
    return { ok: false, error: "Couldn't find the score on the line after “Krillion #…”." };
  }
  const score = Number(m[1].replace(/,/g, ""));
  if (!Number.isSafeInteger(score) || Math.abs(score) > MAX_SCORE) {
    return { ok: false, error: "That score doesn't look right." };
  }

  const grid = rest
    .slice(scoreIdx + 1)
    .filter((l) => l !== "")
    .join("\n");

  return { ok: true, value: { gameNumber, score, grid } };
}
