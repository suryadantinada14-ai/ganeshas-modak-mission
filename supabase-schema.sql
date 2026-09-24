-- Ganesha's Modak Mission Production Supabase Schema
-- Includes Profiles, Game Scores (Attempts), Authorized Leaderboard & RLS Security

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  avatar_url text,
  role text not null default 'player' check (role in ('guest', 'player', 'moderator', 'admin')),
  best_score integer not null default 0 check (best_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns exist if table was already created
alter table public.profiles add column if not exists display_name text not null default 'Player';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text not null default 'player';
alter table public.profiles add column if not exists best_score integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Public can read profiles (needed for leaderboard and display names, emails are never stored here)
drop policy if exists "Anyone can read profiles" on public.profiles;
create policy "Anyone can read profiles" on public.profiles for select to anon, authenticated using (true);

-- Authenticated users can insert their own profile with role='player'
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert to authenticated
  with check (auth.uid() = id and (role is null or role = 'player'));

-- Users can update their own profile, but MUST NOT be able to change their role
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- Trigger to prevent role elevation even if someone tries direct SQL/REST updates
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> old.role and (auth.jwt()->>'role' is distinct from 'service_role') then
    if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      new.role := old.role; -- Silently preserve original role
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tr_protect_profile_role on public.profiles;
create trigger tr_protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Auto-create profile trigger on auth.users (runs on Google OAuth, GitHub OAuth, Email signup)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_avatar text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
    split_part(new.email, '@', 1),
    'Player'
  );
  v_name := substring(v_name from 1 for 40);
  v_avatar := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data->>'picture'), '')
  );

  insert into public.profiles (id, display_name, avatar_url, role, best_score)
  values (new.id, v_name, v_avatar, 'player', 0)
  on conflict (id) do update set
    display_name = coalesce(nullif(profiles.display_name, ''), excluded.display_name),
    avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. GAME SCORES TABLE (Score attempts history)
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

alter table public.game_scores add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.game_scores add column if not exists player_name text not null default 'Player';

alter table public.game_scores enable row level security;

-- Anyone can read score records
drop policy if exists "Anyone can read leaderboard" on public.game_scores;
create policy "Anyone can read leaderboard" on public.game_scores for select to anon, authenticated using (true);

-- Direct client inserts are blocked; must enter through authorized submit_game_score RPC
drop policy if exists "No direct public inserts" on public.game_scores;

-- Authorized score deletion: users can only delete their own scores
drop policy if exists "Users can delete own scores" on public.game_scores;
create policy "Users can delete own scores" on public.game_scores for delete to authenticated
  using (auth.uid() = user_id);

-- 3. AUTHORIZED SCORE SUBMISSION RPC
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
  v_inserted public.game_scores;
begin
  -- Enforce authenticated authorization
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Must be signed in to submit scores';
  end if;

  if p_score < 0 or p_score > 100000 or p_completion_time < 0 or p_completion_time > 86400
    or p_caught_count < 0 or p_caught_count > 999 or p_modaks not between 5 and 6
    or p_festival_items not between 0 and 11 then
    raise exception 'invalid game result';
  end if;

  v_name := coalesce(
    nullif(trim(p_player_name), ''),
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'display_name'), ''),
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    (select display_name from public.profiles where id = v_user_id),
    'Player'
  );
  v_name := substring(v_name from 1 for 40);

  -- Record the game attempt
  insert into public.game_scores(score, completion_time, caught_count, modaks, secret_found, festival_items, user_id, player_name)
  values (p_score, p_completion_time, p_caught_count, p_modaks, p_secret_found, p_festival_items, v_user_id, v_name)
  returning * into v_inserted;

  -- Update or insert profile with new best score if higher
  insert into public.profiles (id, display_name, role, best_score, updated_at)
  values (v_user_id, v_name, 'player', p_score, now())
  on conflict (id) do update set
    display_name = coalesce(nullif(v_name, ''), profiles.display_name),
    best_score = greatest(profiles.best_score, excluded.best_score),
    updated_at = now();

  return next v_inserted;
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

revoke all on function public.submit_game_score(integer,integer,integer,integer,boolean,integer,text) from public, anon;
grant execute on function public.submit_game_score(integer,integer,integer,integer,boolean,integer,text) to authenticated;
revoke all on function public.submit_game_score(integer,integer,integer,integer,boolean,integer) from public, anon;
grant execute on function public.submit_game_score(integer,integer,integer,integer,boolean,integer) to authenticated;

-- 4. DEDUPLICATED GLOBAL LEADERBOARD VIEW
-- Prevents duplicate rows per user, shows highest score per player, ordered highest first
drop view if exists public.leaderboard;
create view public.leaderboard as
with ranked as (
  select
    s.id,
    s.score,
    s.completion_time,
    s.caught_count,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(s.player_name), ''), 'Player') as player_name,
    s.user_id,
    p.avatar_url,
    s.created_at,
    row_number() over (
      partition by coalesce(s.user_id, s.id)
      order by s.score desc, s.completion_time asc, s.caught_count asc, s.created_at asc
    ) as rn
  from public.game_scores s
  left join public.profiles p on p.id = s.user_id
)
select id, score, completion_time, caught_count, player_name, user_id, avatar_url, created_at
from ranked
where rn = 1
order by score desc, completion_time asc, caught_count asc;

grant select on public.leaderboard to anon, authenticated;
grant select on public.profiles to anon, authenticated;
