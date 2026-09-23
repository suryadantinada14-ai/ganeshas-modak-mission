-- Ganesha's Modak Mission shared leaderboard
-- Run this in Supabase SQL Editor. It uses the browser-safe anon key only.
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  score integer not null check (score between 0 and 100000),
  completion_time integer not null check (completion_time between 0 and 86400),
  caught_count integer not null check (caught_count between 0 and 999),
  modaks integer not null check (modaks between 5 and 6),
  secret_found boolean not null default false,
  festival_items integer not null check (festival_items between 0 and 11),
  created_at timestamptz not null default now()
);

alter table public.game_scores enable row level security;
drop policy if exists "Anyone can read leaderboard" on public.game_scores;
create policy "Anyone can read leaderboard" on public.game_scores for select to anon, authenticated using (true);
-- Direct inserts are intentionally blocked. Scores enter through the validated RPC.
drop policy if exists "No direct public inserts" on public.game_scores;

create or replace function public.submit_game_score(
  p_score integer, p_completion_time integer, p_caught_count integer,
  p_modaks integer, p_secret_found boolean, p_festival_items integer
) returns setof public.game_scores
language plpgsql security definer set search_path = public
as $$
begin
  if p_score < 0 or p_score > 100000 or p_completion_time < 0 or p_completion_time > 86400
    or p_caught_count < 0 or p_caught_count > 999 or p_modaks not between 5 and 6
    or p_festival_items not between 0 and 11 then
    raise exception 'invalid game result';
  end if;
  return query insert into public.game_scores(score,completion_time,caught_count,modaks,secret_found,festival_items)
  values (p_score,p_completion_time,p_caught_count,p_modaks,p_secret_found,p_festival_items)
  returning *;
end; $$;
revoke all on function public.submit_game_score(integer,integer,integer,integer,boolean,integer) from public;
grant execute on function public.submit_game_score(integer,integer,integer,integer,boolean,integer) to anon, authenticated;

drop view if exists public.leaderboard;
create view public.leaderboard as
select score,completion_time,caught_count,created_at
from public.game_scores as scores
order by score desc, completion_time asc, caught_count asc, created_at asc;
