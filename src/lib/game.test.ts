import { describe, expect, it } from "vitest";
import { dateForGameNumber, gameNumberForDate, localDate, today } from "./game";

const cfg = { refGame: 129, refDate: "2026-11-22", timeZone: "America/Toronto" };

describe("game numbering", () => {
  it("maps dates to game numbers both ways", () => {
    expect(gameNumberForDate("2026-11-22", cfg)).toBe(129);
    expect(gameNumberForDate("2026-11-23", cfg)).toBe(130);
    expect(gameNumberForDate("2026-03-01", cfg)).toBe(129 - 266);
    expect(dateForGameNumber(130, cfg)).toBe("2026-11-23");
  });

  it("is stable across DST changes", () => {
    expect(gameNumberForDate("2027-03-15", cfg) - gameNumberForDate("2027-03-14", cfg)).toBe(1);
  });

  it("uses the configured timezone for 'today'", () => {
    // 03:30 UTC on the 23rd is still the 22nd in Toronto
    const now = new Date("2026-11-23T03:30:00Z");
    expect(localDate(now, "UTC")).toBe("2026-11-23");
    expect(today(now, cfg)).toEqual({ date: "2026-11-22", gameNumber: 129 });
  });
});
