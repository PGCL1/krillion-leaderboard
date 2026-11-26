import { describe, expect, it } from "vitest";
import { ordinal, profileStats, type Finish } from "./stats";

const s = (game_number: number, score: number, rank = 1, field = 1): Finish => ({ game_number, score, rank, field });

describe("profileStats", () => {
  it("is empty for someone who never played", () => {
    const st = profileStats([], 10);
    expect(st.days).toEqual([]);
    expect(st.avg).toBeNull();
    expect(st.streak).toBe(0);
  });

  it("keeps each day's finish and counts podiums", () => {
    const st = profileStats([s(1, 200, 2, 3), s(2, 300, 1, 2), s(3, 150, 4, 4), s(4, 180, 3, 3)], 4);
    expect(st.days.map((d) => [d.game, d.rank, d.field])).toEqual([
      [1, 2, 3],
      [2, 1, 2],
      [3, 4, 4],
      [4, 3, 3],
    ]);
    expect(st.podiums).toEqual({ 1: 1, 2: 1, 3: 1 });
    expect(st.deepest).toBe(300);
  });

  it("averages only played games and holds the average across missed days", () => {
    const st = profileStats([s(1, 100), s(3, 200)], 3);
    expect(st.days.map((d) => [d.score, d.avg, d.field])).toEqual([
      [100, 100, 1],
      [null, 100, null],
      [200, 150, 1],
    ]);
    expect(st.dives).toBe(2);
    expect(st.avg).toBe(150);
  });

  it("runs the timeline to today, even when they haven't played today", () => {
    const st = profileStats([s(5, 100)], 8);
    expect(st.days.map((d) => d.game)).toEqual([5, 6, 7, 8]);
  });

  it("counts the streak back from the latest game, ignoring today until it's played", () => {
    const scores = [s(1, 100), s(3, 100), s(4, 100), s(5, 100)];
    expect(profileStats(scores, 5).streak).toBe(3);
    expect(profileStats(scores, 6).streak).toBe(3); // today (6) not played yet
    expect(profileStats(scores, 7).streak).toBe(0); // missed 6
  });

  it("reports the 7-game change once there's history that far back", () => {
    const scores = Array.from({ length: 8 }, (_, i) => s(i + 1, i < 1 ? 100 : 200));
    const st = profileStats(scores, 8);
    expect(st.avgChange7).toBeCloseTo((100 + 7 * 200) / 8 - 100);
    expect(profileStats(scores.slice(0, 3), 3).avgChange7).toBeNull();
  });
});

describe("ordinal", () => {
  it("handles the teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 111].map(ordinal)).toEqual(
      ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "111th"],
    );
  });
});
