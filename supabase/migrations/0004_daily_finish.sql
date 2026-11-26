-- Where each score finished on its day, for the player log page.
-- rank() is competition ranking (1, 2, 2, 4), the same as withRanks() in src/lib/rank.ts.

create view public.daily_finish with (security_invoker = true) as
select
  player_id,
  game_number,
  score,
  rank() over (partition by game_number order by score desc)::int as rank,
  count(*) over (partition by game_number)::int                  as field
from public.scores;

revoke all on public.daily_finish from anon, authenticated;
grant select on public.daily_finish to service_role;
