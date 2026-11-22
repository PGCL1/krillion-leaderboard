import { describe, expect, it } from "vitest";
import { parseKrillion } from "./parse";

describe("parseKrillion", () => {
  it("parses the standard share text", () => {
    const r = parseKrillion("Krillion #129 🦐\n180\n\n🦑⬛⬛🐟🐟🦑⬛");
    expect(r).toEqual({ ok: true, value: { gameNumber: 129, score: 180, grid: "🦑⬛⬛🐟🐟🦑⬛" } });
  });

  it("tolerates surrounding whitespace, CRLF and leading junk", () => {
    const r = parseKrillion("  hey look\r\n  Krillion #7 🦐  \r\n\r\n 1,250 \r\n🐟");
    expect(r).toEqual({ ok: true, value: { gameNumber: 7, score: 1250, grid: "🐟" } });
  });

  it("accepts a zero score", () => {
    const r = parseKrillion("Krillion #130 🦐\n0\n⬛⬛⬛");
    expect(r.ok && r.value.score).toBe(0);
  });

  it("rejects text without a header", () => {
    expect(parseKrillion("180\n🦑").ok).toBe(false);
  });

  it("rejects a non-numeric score line", () => {
    expect(parseKrillion("Krillion #129 🦐\n🦑⬛⬛").ok).toBe(false);
    expect(parseKrillion("Krillion #129 🦐\n180 points").ok).toBe(false);
  });
});
