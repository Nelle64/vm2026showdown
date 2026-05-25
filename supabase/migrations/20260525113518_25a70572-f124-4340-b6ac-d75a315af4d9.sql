-- 1. lock_mode på games
create type public.game_lock_mode as enum ('per_match', 'per_round');
alter table public.games add column lock_mode public.game_lock_mode not null default 'per_match';

-- 2. rounds-tabell
create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  lock_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_rounds_game on public.rounds(game_id);

alter table public.rounds enable row level security;

create policy "members read rounds" on public.rounds
  for select using (public.is_game_member(game_id, auth.uid()));

create policy "admins manage rounds" on public.rounds
  for all using (public.is_game_admin(game_id, auth.uid()))
  with check (public.is_game_admin(game_id, auth.uid()));

create trigger rounds_touch_updated_at before update on public.rounds
  for each row execute function public.touch_updated_at();

-- 3. round_matches-tabell
create table public.round_matches (
  round_id uuid not null references public.rounds(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (round_id, match_id),
  unique (game_id, match_id) -- en match kan bara ligga i en omgång per spel
);
create index idx_round_matches_game_match on public.round_matches(game_id, match_id);

alter table public.round_matches enable row level security;

create policy "members read round_matches" on public.round_matches
  for select using (public.is_game_member(game_id, auth.uid()));

create policy "admins manage round_matches" on public.round_matches
  for all using (public.is_game_admin(game_id, auth.uid()))
  with check (public.is_game_admin(game_id, auth.uid()));

-- 4. Ny lås-funktion per spel
create or replace function public.is_match_locked_for_game(_match_id uuid, _game_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _mode public.game_lock_mode;
  _round_id uuid;
  _lock_at timestamptz;
  _kickoff timestamptz;
begin
  select lock_mode into _mode from public.games where id = _game_id;
  if _mode is null then
    return public.is_match_locked(_match_id);
  end if;

  if _mode = 'per_match' then
    return public.is_match_locked(_match_id);
  end if;

  -- per_round: hitta omgången för matchen i detta spel
  select rm.round_id into _round_id
  from public.round_matches rm
  where rm.game_id = _game_id and rm.match_id = _match_id;

  if _round_id is null then
    -- match inte tilldelad omgång → fall tillbaka på per-match
    return public.is_match_locked(_match_id);
  end if;

  select r.lock_at into _lock_at from public.rounds r where r.id = _round_id;

  if _lock_at is null then
    -- auto: 1 min före tidigaste kickoff i omgången
    select min(m.kickoff_at) into _kickoff
    from public.round_matches rm
    join public.matches m on m.id = rm.match_id
    where rm.round_id = _round_id;
    if _kickoff is null then
      return public.is_match_locked(_match_id);
    end if;
    _lock_at := _kickoff - interval '1 minute';
  end if;

  return _lock_at <= now();
end; $$;

-- 5. Uppdatera predictions RLS att använda per-spel-lås
drop policy if exists "insert own prediction if unlocked and member" on public.predictions;
drop policy if exists "update own prediction before lock" on public.predictions;
drop policy if exists "others predictions readable if locked and same game" on public.predictions;

create policy "insert own prediction if unlocked and member" on public.predictions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_game_member(game_id, auth.uid())
    and not public.is_match_locked_for_game(match_id, game_id)
  );

create policy "update own prediction before lock" on public.predictions
  for update
  using (auth.uid() = user_id and not public.is_match_locked_for_game(match_id, game_id))
  with check (auth.uid() = user_id and not public.is_match_locked_for_game(match_id, game_id));

create policy "others predictions readable if locked and same game" on public.predictions
  for select
  using (public.is_game_member(game_id, auth.uid()) and public.is_match_locked_for_game(match_id, game_id));