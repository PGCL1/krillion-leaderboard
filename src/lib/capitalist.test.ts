import { describe, expect, it } from "vitest";
import { isProvisional, localStamp, payDive } from "./capitalist";

const TZ = "Europe/Madrid";
// 2026-11-24 in Madrid is UTC+1, so 17:30 local = 16:30Z.
const at = (hhmmZ: string) => `2026-11-24T${hhmmZ}:00Z`;
const s = (player_id: string, score: number, hhmmZ = "10:00") => ({ player_id, score, submitted_at: at(hhmmZ) });
const bonuses = (rows: { player_id: string; bonus: number }[]) =>
  Object.fromEntries(rows.map((r) => [r.player_id, r.bonus]));

describe("yuki capitalist payouts", () => {
  it("pays the podium +50 / +20 / +10 and taxes everyone else", () => {
    const out = payDive([s("a", 300), s("b", 200), s("c", 100), s("d", 50)], "2026-11-24", TZ, "17:30");
    expect(bonuses(out)).toEqual({ a: 50, b: 20, c: 10, d: 0 });
    expect(out.find((r) => r.player_id === "a")?.total).toBe(350);
  });

  it("gives tied players the same place's bonus and skips the next place", () => {
    const out = payDive([s("a", 300), s("b", 200), s("c", 200), s("d", 100)], "2026-11-24", TZ, "17:30");
    expect(bonuses(out)).toEqual({ a: 50, b: 20, c: 20, d: 0 });
  });

  it("decides the podium from scores in before 17:30 local; later scores get no loot", () => {
    // 16:29Z = 17:29 Madrid (on time), 16:30Z = 17:30 Madrid (late)
    const out = payDive([s("early", 100, "16:29"), s("late", 999, "16:30")], "2026-11-24", TZ, "17:30");
    expect(bonuses(out)).toEqual({ early: 50, late: 0 });
    expect(out.find((r) => r.player_id === "late")?.late).toBe(true);
  });

  it("still pays out on a quiet day", () => {
    expect(bonuses(payDive([s("solo", 10)], "2026-11-24", TZ, "17:30"))).toEqual({ solo: 50 });
  });

  it("is provisional until the cutoff", () => {
    expect(isProvisional("2026-11-24", TZ, new Date(at("16:29")), "17:30")).toBe(true);
    expect(isProvisional("2026-11-24", TZ, new Date(at("16:30")), "17:30")).toBe(false);
    expect(localStamp(new Date(at("16:30")), TZ)).toBe("2026-11-24T17:30");
  });
});
