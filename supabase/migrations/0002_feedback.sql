-- Feedback and feature ideas sent from the in-app bottle.
-- Same model as the other tables: RLS on with no policies, only the server (service role) reads/writes.

create table public.feedback (
  id         bigint generated always as identity primary key,
  player_id  text references public.players (id) on delete set null,
  kind       text not null check (kind in ('feedback', 'idea', 'bug')),
  message    text not null check (char_length(message) between 1 and 2000),
  page       text,                 -- the page they were on when they sent it
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_player_idx on public.feedback (player_id, created_at desc);

alter table public.feedback enable row level security;

grant select, insert, update, delete on public.feedback to service_role;
grant usage, select on all sequences in schema public to service_role;
