# Krillion Leaderboard

Daily + overall leaderboard for a friend group playing krillion.io. See README.md for product behavior and setup.

## Stack
- Next.js 15 (App Router, server components, server actions), React 19, TypeScript, Tailwind v4
- Clerk for auth: **username + password only** (no email, no OAuth). Custom `AuthForm` component, not Clerk's prebuilt UI.
- Supabase = Postgres only. Every DB call goes through the server with the service-role key (`createAdminClient()` in `src/lib/supabase/admin.ts`). RLS is on with no policies, so the anon key can read nothing. Never use Supabase from client components.
- Deployed on Vercel.

## Commands
```sh
npm run dev          # http://localhost:3000
npm test             # vitest: src/lib/*.test.ts (parser + game-number math)
npm run lint
npm run build        # run before declaring a change done; catches type errors
npm run seed         # fake players/scores (ids prefixed "seed_"); seed:clear removes them
```

## Map
- `src/lib/auth.ts`: `requirePlayer()` is the gate for every page/action. It onboards via admin usernames (`ADMIN_USERNAMES`) or an invite cookie, and redirects otherwise.
- `src/lib/game.ts`: game number ↔ date math from `KRILLION_REFERENCE_GAME/DATE` + `KRILLION_TIMEZONE`.
- `src/lib/parse.ts`: parses pasted Krillion share text. `src/lib/rank.ts` handles competition ranking (1,2,2,4).
- `src/lib/stats.ts`: per-player log numbers (running average, finishes, podiums, streak) from the `daily_finish` view.
- `src/app/players/[username]/page.tsx`: a player's log (real scores only). Every name on the boards links here; the header has "my log".
- `src/app/actions.ts`: `submitScore`. `src/app/admin/actions.ts`: invites (admin only).
- `src/app/invite/[code]/route.ts`: sets the invite cookie, then sends the user to sign-in.
- `src/middleware.ts`: Clerk protects everything except sign-in, sign-up and invite.
- `supabase/migrations/`: schema (players, invites, scores, feedback, `overall_leaderboard` and `daily_finish` views, `redeem_invite` RPC). Schema changes go in a **new** numbered migration; don't edit 0001.

## Rules
- A player's identity is their **username** (lowercase): it is `players.username`, the primary key, and what every `player_id`/`created_by` foreign key holds. The Clerk user id lives in `players.clerk_id` and is only used to match a session to a player (`requirePlayer`). Never key anything new on the Clerk id. Foreign keys to players use `on update cascade` so a Clerk username change carries through.
- One score per player per game, no edits. The DB unique constraint enforces this; don't add an edit path.
- Any game number the parsed share text contains can be submitted; there is no "is this today's game" check (Krillion's rollover can differ from `KRILLION_TIMEZONE`). `KRILLION_TIMEZONE` is still what decides which game the home page treats as today.
- Overall ranking = average per game *played*. Missed days don't count. Under `MIN_GAMES_FOR_RANKING` games = provisional.
- Design system lives in `src/app/globals.css`: dark "abyss" theme, VT323 pixel font, pixel frames via `--frame-*` box-shadows, tier colors. Reuse the CSS variables. Don't introduce new colors or fonts.
- Secrets: real keys only in `.env.local`. `.githooks/pre-commit` blocks env files and key-shaped strings. Add new env vars to `.env.example` with placeholder values.
- Business logic that can be unit-tested goes in `src/lib/` as pure functions with a `*.test.ts` next to it.
