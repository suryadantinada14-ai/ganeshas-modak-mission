-- Ganesha's Modak Mission authorized shared leaderboard
-- Run this in Supabase SQL Editor. Enforces authenticated authorization and RLS.
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  player_name text not null default 'Player',
  score integer not null check (score between 0 and 100000),
  completion_time integer not null check (completion_time between 0 and 86400),
  caught_count integer not null check (caught_count between 0 and 999),
  modaks integer not null check (modaks between 5 and 6),
  secret_found boolean not null default false,
  festival_items integer not null check (festival_items between 0 and 11),
  created_at timestamptz not null default now()
);

-- Ensure columns exist if table was already created
alter table public.game_scores add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.game_scores add column if not exists player_name text not null default 'Player';

alter table public.game_scores enable row level security;

-- Public can read leaderboard entries
drop policy if exists "Anyone can read leaderboard" on public.game_scores;
create policy "Anyone can read leaderboard" on public.game_scores for select to anon, authenticated using (true);

-- Direct client inserts are blocked; must enter through authorized RPC
drop policy if exists "No direct public inserts" on public.game_scores;

-- Authorized score deletion: users can delete their own scores
drop policy if exists "Users can delete own scores" on public.game_scores;
create policy "Users can delete own scores" on public.game_scores for delete to authenticated
  using (auth.uid() = user_id);

-- Authorized submission RPC: strictly requires authenticated session (auth.uid() IS NOT NULL)
create or replace function public.submit_game_score(
  p_score integer, p_completion_time integer, p_caught_count integer,
  p_modaks integer, p_secret_found boolean, p_festival_items integer,
  p_player_name text default null
) returns setof public.game_scores
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_name text;
begin
  -- Enforce authorization
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Must be signed in to submit scores';
  end if;

  if p_score < 0 or p_score > 100000 or p_completion_time < 0 or p_completion_time > 86400
    or p_caught_count < 0 or p_caught_count > 999 or p_modaks not between 5 and 6
    or p_festival_items not between 0 and 11 then
    raise exception 'invalid game result';
  end if;

  v_name := coalesce(nullif(trim(p_player_name), ''), nullif(trim(auth.jwt() -> 'user_metadata' ->> 'display_name'), ''), 'Player');
  v_name := substring(v_name from 1 for 40);

  return query insert into public.game_scores(score, completion_time, caught_count, modaks, secret_found, festival_items, user_id, player_name)
  values (p_score, p_completion_time, p_caught_count, p_modaks, p_secret_found, p_festival_items, v_user_id, v_name)
  returning *;
end; $$;

-- Overload for backwards compatibility
create or replace function public.submit_game_score(
  p_score integer, p_completion_time integer, p_caught_count integer,
  p_modaks integer, p_secret_found boolean, p_festival_items integer
) returns setof public.game_scores
language plpgsql security definer set search_path = public
as $$
begin
  return query select * from public.submit_game_score(p_score, p_completion_time, p_caught_count, p_modaks, p_secret_found, p_festival_items, null);
end; $$;

-- Only authenticated users are granted execution permission on submit_game_score
revoke all on function public.submit_game_score(integer,integer,integer,integer,boolean,integer,text) from public, anon;
grant execute on function public.submit_game_score(integer,integer,integer,integer,boolean,integer,text) to authenticated;
revoke all on function public.submit_game_score(integer,integer,integer,integer,boolean,integer) from public, anon;
grant execute on function public.submit_game_score(integer,integer,integer,integer,boolean,integer) to authenticated;

drop view if exists public.leaderboard;
create view public.leaderboard as
select id, score, completion_time, caught_count, player_name, user_id, created_at
from public.game_scores as scores
order by score desc, completion_time asc, caught_count asc, created_at asc;

grant select on public.leaderboard to anon, authenticated;
