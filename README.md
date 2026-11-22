# 🦐 Krillion Leaderboard

Daily + overall leaderboard for a friend group playing [krillion.io](https://krillion.io).
Next.js (App Router) + Clerk (Google sign-in) + Supabase (Postgres) on Vercel.

## How it works

- **Sign in with Google** via Clerk. Only approved players get in: emails in `ADMIN_EMAILS` are auto-approved;
  everyone else needs an invite link (`/invite/<code>`), created by an admin on `/admin`.
- **Submit** by pasting Krillion's share text (`Krillion #129 🦐` / `180` / emoji grid).
  The server parses it, checks it's *today's* game number, and stores it. One score per player per game, no edits
  (enforced by a unique constraint in the DB).
- **Daily board**: ranks scores for a game; browse past games with Prev/Next. Shows who still has to play today.
- **Overall board**: average score per game *played* — missed days don't count, so late joiners aren't penalized.
  Players with fewer than `MIN_GAMES_FOR_RANKING` games are listed as provisional.

## Setup

1. **Supabase** (database only): create a project. In the SQL editor, run `supabase/migrations/0001_init.sql`.
   Copy the project URL and the `service_role` key.
2. **Clerk** (auth): create an application with **Google** as the only sign-in option.
   - Development instances work with Google immediately using Clerk's shared credentials.
   - For production, add your own Google OAuth client in Clerk → Configure → SSO connections → Google
     (Clerk shows the redirect URI to paste into Google Cloud Console).
   - Copy the publishable and secret keys.
3. **Env vars**: copy `.env.example` to `.env.local` and fill it in. Set the same vars in Vercel.
   - `KRILLION_REFERENCE_GAME` / `KRILLION_REFERENCE_DATE`: any game number and the date it was the daily puzzle.
   - `KRILLION_TIMEZONE`: the IANA timezone the "day" is counted in (e.g. `America/Toronto`).
4. `npm install && npm run dev` → http://localhost:3000. Sign in with an admin email, go to **Admin**, create an
   invite link, share it in the group chat.
5. **Deploy**: push to GitHub, import into Vercel, add the env vars.

## Dev

```sh
npm run dev     # local server
npm test        # parser + game-number tests
npm run lint
```

## Later

- Weekly bonus system (resets weekly): `scores.played_on` is stored per row so weekly windows are a simple query.
- Charts / per-player history.
