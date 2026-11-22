-- Krillion leaderboard schema.
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Auth is handled by Clerk; player ids are Clerk user ids (text, e.g. "user_2abc...").
-- All reads and writes go through the Next.js server using the service-role key.
-- RLS is enabled with no policies, so the anon/public API key can't read anything.

create table public.players (
  id           text primary key,             -- Clerk user id
  email        text not null,
  display_name text not null,
  avatar_url   text,
  is_admin     boolean not null default false,
  joined_at    timestamptz not null default now()
);

create table public.invites (
  code       text primary key,
  created_by text references public.players (id) on delete set null,
  created_at timestamptz not null default now(),
  max_uses   int,                -- null = unlimited
  uses       int not null default 0,
  expires_at timestamptz,        -- null = never
  revoked    boolean not null default false
);

create table public.scores (
  id           bigint generated always as identity primary key,
  player_id    text not null references public.players (id) on delete cascade,
  game_number  int not null,
  score        int not null,
  raw          text not null,     -- original pasted share text (emoji grid etc.)
  played_on    date not null,     -- local date of the game, in KRILLION_TIMEZONE
  submitted_at timestamptz not null default now(),
  unique (player_id, game_number) -- one score per player per game, no edits
);

create index scores_game_number_idx on public.scores (game_number);
create index scores_played_on_idx on public.scores (played_on);

alter table public.players enable row level security;
alter table public.invites enable row level security;
alter table public.scores  enable row level security;

-- No policies: only the service role (server) can touch these tables.

-- Overall leaderboard: average per game actually played (missed days don't count).
create view public.overall_leaderboard with (security_invoker = true) as
select
  p.id                                  as player_id,
  p.display_name,
  p.avatar_url,
  count(s.id)::int                      as games_played,
  coalesce(sum(s.score), 0)::int        as total_score,
  round(avg(s.score)::numeric, 1)::float8 as avg_score,
  max(s.score)                          as best_score
from public.players p
left join public.scores s on s.player_id = p.id
group by p.id;

-- Atomically consume an invite and create the player. Called with the service role.
create function public.redeem_invite(
  p_code text, p_user text, p_email text, p_name text, p_avatar text
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from players where id = p_user) then
    return true;
  end if;

  update invites
     set uses = uses + 1
   where code = p_code
     and not revoked
     and (max_uses is null or uses < max_uses)
     and (expires_at is null or expires_at > now());

  if not found then
    return false;
  end if;

  insert into players (id, email, display_name, avatar_url)
  values (p_user, p_email, p_name, p_avatar)
  on conflict (id) do nothing;
  return true;
end;
$$;

revoke execute on function public.redeem_invite(text, text, text, text, text) from public, anon, authenticated;
revoke all on public.overall_leaderboard from anon, authenticated;

-- Explicit grants for the server (service role). Needed when the project has
-- "Grant API access to new tables automatically" turned off, and because the
-- revoke above also removes the default PUBLIC execute right.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.players, public.invites, public.scores to service_role;
grant usage, select on all sequences in schema public to service_role;
grant select on public.overall_leaderboard to service_role;
grant execute on function public.redeem_invite(text, text, text, text, text) to service_role;
