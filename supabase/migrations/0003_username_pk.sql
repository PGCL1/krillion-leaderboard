-- Players are identified by their Clerk username from now on.
--
--   players.username  primary key, lowercase. Every foreign key (scores, feedback, invites) holds it.
--   players.clerk_id  the Clerk user id ("user_..."), unique. Only used to match a signed-in session to a player.
--
-- Foreign keys use `on update cascade`, so if someone renames themselves in Clerk, the app updates
-- players.username once and their scores, bottles and invites follow.

alter table public.players add column username text, add column clerk_id text;

-- Backfill. Checked against Clerk on 2026-11-26: every existing player's display name is their username.
-- Fake seed players ("seed_...") keep their id as username.
update public.players
   set clerk_id = id,
       username = case when id like 'seed\_%' then id else lower(display_name) end;

alter table public.players
  alter column username set not null,
  alter column clerk_id set not null,
  add constraint players_clerk_id_key unique (clerk_id),
  add constraint players_username_lowercase check (username = lower(username));

-- Re-point every foreign key from the Clerk id to the username.
alter table public.scores   drop constraint scores_player_id_fkey;
alter table public.feedback drop constraint feedback_player_id_fkey;
alter table public.invites  drop constraint invites_created_by_fkey;

update public.scores   s set player_id  = p.username from public.players p where s.player_id  = p.id;
update public.feedback f set player_id  = p.username from public.players p where f.player_id  = p.id;
update public.invites  i set created_by = p.username from public.players p where i.created_by = p.id;

drop view public.overall_leaderboard;
alter table public.players drop constraint players_pkey;
alter table public.players drop column id;
alter table public.players add constraint players_pkey primary key (username);

alter table public.scores add constraint scores_player_id_fkey
  foreign key (player_id) references public.players (username) on delete cascade on update cascade;
alter table public.feedback add constraint feedback_player_id_fkey
  foreign key (player_id) references public.players (username) on delete set null on update cascade;
alter table public.invites add constraint invites_created_by_fkey
  foreign key (created_by) references public.players (username) on delete set null on update cascade;

-- Same view as 0001, keyed by username.
create view public.overall_leaderboard with (security_invoker = true) as
select
  p.username                            as player_id,
  p.display_name,
  p.avatar_url,
  count(s.id)::int                      as games_played,
  coalesce(sum(s.score), 0)::int        as total_score,
  round(avg(s.score)::numeric, 1)::float8 as avg_score,
  max(s.score)                          as best_score
from public.players p
left join public.scores s on s.player_id = p.username
group by p.username;

revoke all on public.overall_leaderboard from anon, authenticated;
grant select on public.overall_leaderboard to service_role;

-- redeem_invite now takes the username and the Clerk id separately.
drop function public.redeem_invite(text, text, text, text, text);

create function public.redeem_invite(
  p_code text, p_username text, p_clerk_id text, p_email text, p_name text, p_avatar text
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from players where clerk_id = p_clerk_id) then
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

  insert into players (username, clerk_id, email, display_name, avatar_url)
  values (lower(p_username), p_clerk_id, p_email, p_name, p_avatar)
  on conflict do nothing;
  return true;
end;
$$;

revoke execute on function public.redeem_invite(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.redeem_invite(text, text, text, text, text, text) to service_role;
