// Fills the database with fake players + scores for testing.
//
//   npm run seed         add fake data (safe to re-run: existing seed scores are kept)
//   npm run seed:clear   remove all fake data
//
// Every fake player id starts with "seed_", so clearing never touches real players.
// Reads SUPABASE_* and KRILLION_* from .env.local.

import { createClient } from "@supabase/supabase-js";

const DAYS = 21; // how many days of history, ending today
const PREFIX = "seed_";

// name, typical score, consistency (spread), how often they play, joined N days ago, played today?
const PLAYERS = [
  { name: "marta",   avg: 210, spread: 40, playRate: 0.95, joined: 21, today: true },
  { name: "jordi",   avg: 185, spread: 60, playRate: 0.85, joined: 21, today: true },
  { name: "lucía",   avg: 160, spread: 35, playRate: 0.9,  joined: 18, today: false },
  { name: "pablo",   avg: 240, spread: 25, playRate: 0.6,  joined: 21, today: true },
  { name: "nora",    avg: 130, spread: 50, playRate: 0.8,  joined: 14, today: true },
  { name: "sergi",   avg: 175, spread: 70, playRate: 0.7,  joined: 21, today: false },
  { name: "elena",   avg: 195, spread: 30, playRate: 1,    joined: 7,  today: true },
  { name: "dani",    avg: 150, spread: 45, playRate: 1,    joined: 2,  today: false }, // too few games → provisional
];

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing ${k} (run with --env-file=.env.local)`);
  return v;
};

const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- game numbering (same math as src/lib/game.ts) ---
const refGame = Number(env("KRILLION_REFERENCE_GAME"));
const refDate = env("KRILLION_REFERENCE_DATE");
const timeZone = process.env.KRILLION_TIMEZONE || "UTC";
const dayIndex = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};
const isoFromIndex = (i) => new Date(i * 86_400_000).toISOString().slice(0, 10);
const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const gameFor = (iso) => refGame + (dayIndex(iso) - dayIndex(refDate));

// --- deterministic randomness so re-runs give the same numbers ---
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());

const EMOJI = ["🦑", "🐟", "⬛", "🦐", "🐙"];
const grid = () => Array.from({ length: 7 }, () => EMOJI[Math.floor(rand() * EMOJI.length)]).join("");

async function clear() {
  const { error, count } = await db.from("players").delete({ count: "exact" }).like("id", `${PREFIX}%`);
  if (error) throw error;
  console.log(`removed ${count ?? 0} fake players (their scores went with them)`);
}

async function add() {
  const todayIdx = dayIndex(todayIso);

  const players = PLAYERS.map((p) => ({
    id: PREFIX + p.name,
    email: "",
    display_name: p.name,
    avatar_url: null,
    is_admin: false,
    joined_at: new Date((todayIdx - p.joined) * 86_400_000 + 9 * 3_600_000).toISOString(),
  }));
  const { error: pErr } = await db.from("players").upsert(players, { onConflict: "id" });
  if (pErr) throw pErr;

  const scores = [];
  for (const p of PLAYERS) {
    for (let ago = Math.min(p.joined, DAYS) - 1; ago >= 0; ago--) {
      const isToday = ago === 0;
      if (isToday ? !p.today : rand() > p.playRate) continue;
      const played_on = isoFromIndex(todayIdx - ago);
      const game_number = gameFor(played_on);
      const score = Math.max(0, Math.round(p.avg + gauss() * p.spread));
      scores.push({
        player_id: PREFIX + p.name,
        game_number,
        score,
        raw: `Krillion #${game_number} 🦐\n${score}\n\n${grid()}`,
        played_on,
        submitted_at: new Date((todayIdx - ago) * 86_400_000 + (8 + rand() * 12) * 3_600_000).toISOString(),
      });
    }
  }
  const { error: sErr } = await db
    .from("scores")
    .upsert(scores, { onConflict: "player_id,game_number", ignoreDuplicates: true });
  if (sErr) throw sErr;

  console.log(
    `added ${players.length} fake players and up to ${scores.length} scores ` +
      `(games #${gameFor(isoFromIndex(todayIdx - DAYS + 1))}–#${gameFor(todayIso)}, today = ${todayIso})`,
  );
}

const run = process.argv.includes("--clear") ? clear : add;
run().catch((e) => {
  console.error("seed failed:", e.message ?? e);
  process.exit(1);
});
