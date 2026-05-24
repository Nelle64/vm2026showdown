
-- ============ ROLES ============
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create policy "own roles readable" on public.user_roles for select using (auth.uid() = user_id);
create policy "admins read all roles" on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  total_points int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- trigger to auto-create profile + default user role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ TEAMS ============
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  code text not null unique,
  name text not null,
  group_letter text,
  flag_emoji text,
  created_at timestamptz not null default now()
);
alter table public.teams enable row level security;
create policy "teams readable to all" on public.teams for select using (true);
create policy "admins manage teams" on public.teams for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============ MATCHES ============
create type public.match_status as enum ('scheduled','locked','live','finished','postponed','cancelled');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  home_team_id uuid references public.teams(id) on delete restrict,
  away_team_id uuid references public.teams(id) on delete restrict,
  kickoff_at timestamptz not null,
  status match_status not null default 'scheduled',
  home_score int,
  away_score int,
  stage text not null default 'group',
  group_letter text,
  venue text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.matches enable row level security;
create policy "matches readable to all" on public.matches for select using (true);
create policy "admins manage matches" on public.matches for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create index matches_kickoff_idx on public.matches(kickoff_at);

-- ============ GAMES ============
create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_at timestamptz not null default now()
);
alter table public.games enable row level security;

create table public.game_members (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (game_id, user_id)
);
alter table public.game_members enable row level security;

-- helper: is current user a member of game?
create or replace function public.is_game_member(_game_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.game_members where game_id=_game_id and user_id=_user_id)
$$;

create or replace function public.is_game_admin(_game_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.game_members where game_id=_game_id and user_id=_user_id and is_admin=true)
    or exists(select 1 from public.games where id=_game_id and owner_id=_user_id)
$$;

create policy "games visible to members or owner" on public.games for select using (
  owner_id = auth.uid() or public.is_game_member(id, auth.uid())
);
create policy "any authed can create game" on public.games for insert to authenticated with check (auth.uid() = owner_id);
create policy "owner or admin update game" on public.games for update using (public.is_game_admin(id, auth.uid())) with check (public.is_game_admin(id, auth.uid()));
create policy "owner delete game" on public.games for delete using (auth.uid() = owner_id);

create policy "members see member list" on public.game_members for select using (
  public.is_game_member(game_id, auth.uid()) or exists(select 1 from public.games g where g.id = game_id and g.owner_id = auth.uid())
);
create policy "join self into game" on public.game_members for insert to authenticated with check (auth.uid() = user_id);
create policy "leave self" on public.game_members for delete using (auth.uid() = user_id or public.is_game_admin(game_id, auth.uid()));
create policy "admin modifies members" on public.game_members for update using (public.is_game_admin(game_id, auth.uid())) with check (public.is_game_admin(game_id, auth.uid()));

-- when game created, owner becomes admin member
create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.game_members (game_id, user_id, is_admin) values (new.id, new.owner_id, true) on conflict do nothing;
  return new;
end; $$;
create trigger games_owner_member after insert on public.games for each row execute function public.add_owner_as_member();

-- ============ PREDICTIONS ============
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_score int not null check (home_score >= 0 and home_score <= 30),
  away_score int not null check (away_score >= 0 and away_score <= 30),
  points int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, user_id, match_id)
);
alter table public.predictions enable row level security;
create index predictions_user_idx on public.predictions(user_id);
create index predictions_match_idx on public.predictions(match_id);

-- helper: is match locked (1 minute before kickoff)?
create or replace function public.is_match_locked(_match_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.matches m where m.id=_match_id and (m.kickoff_at - interval '1 minute') <= now())
$$;

create policy "own predictions readable" on public.predictions for select using (auth.uid() = user_id);
create policy "others predictions readable if locked and same game" on public.predictions for select using (
  public.is_game_member(game_id, auth.uid()) and public.is_match_locked(match_id)
);
create policy "insert own prediction if unlocked and member" on public.predictions for insert to authenticated with check (
  auth.uid() = user_id
  and public.is_game_member(game_id, auth.uid())
  and not public.is_match_locked(match_id)
);
create policy "update own prediction before lock" on public.predictions for update using (
  auth.uid() = user_id and not public.is_match_locked(match_id)
) with check (auth.uid() = user_id and not public.is_match_locked(match_id));

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end; $$;
create trigger predictions_touch before update on public.predictions for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger matches_touch before update on public.matches for each row execute function public.touch_updated_at();

-- ============ SCORING ============
-- Compute points for a single prediction given match result
create or replace function public.compute_points(p_home int, p_away int, r_home int, r_away int)
returns int language sql immutable as $$
  select case
    when p_home is null or p_away is null or r_home is null or r_away is null then 0
    when p_home = r_home and p_away = r_away then 3
    when sign(p_home - p_away) = sign(r_home - r_away) then 1
    else 0
  end
$$;

-- After a match is set to finished, recompute predictions and profile totals
create or replace function public.score_match_predictions()
returns trigger language plpgsql security definer set search_path=public as $$
declare uids uuid[];
begin
  if new.status = 'finished' and new.home_score is not null and new.away_score is not null then
    update public.predictions
      set points = public.compute_points(home_score, away_score, new.home_score, new.away_score)
      where match_id = new.id;

    -- update affected users' totals (main game + bonus combined)
    select array_agg(distinct user_id) into uids from public.predictions where match_id = new.id;
    if uids is not null then
      update public.profiles p set total_points = coalesce(
        (select sum(points) from public.predictions where user_id = p.id and points is not null), 0
      ) + coalesce(
        (select sum(points) from public.bonus_answers where user_id = p.id and points is not null), 0
      )
      where p.id = any(uids);
    end if;
  end if;
  return new;
end; $$;

create trigger matches_score_after_finish after update on public.matches
  for each row when (new.status = 'finished' and (old.status is distinct from new.status or old.home_score is distinct from new.home_score or old.away_score is distinct from new.away_score))
  execute function public.score_match_predictions();

-- ============ BONUS QUESTIONS ============
create type public.bonus_status as enum ('open','locked','settled');
create type public.bonus_type as enum ('number','text','multi_choice','team','player');

create table public.bonus_questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  question text not null,
  answer_type bonus_type not null,
  options jsonb,
  points int not null default 5,
  lock_at timestamptz not null,
  status bonus_status not null default 'open',
  correct_answer jsonb,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.bonus_questions enable row level security;
create policy "members read bonus questions" on public.bonus_questions for select using (public.is_game_member(game_id, auth.uid()));
create policy "admins manage bonus questions" on public.bonus_questions for all using (public.is_game_admin(game_id, auth.uid())) with check (public.is_game_admin(game_id, auth.uid()));

create table public.bonus_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.bonus_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer jsonb not null,
  points int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, user_id)
);
alter table public.bonus_answers enable row level security;
create trigger bonus_answers_touch before update on public.bonus_answers for each row execute function public.touch_updated_at();

create or replace function public.is_bonus_open(_question_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.bonus_questions q where q.id=_question_id and q.status='open' and q.lock_at > now())
$$;

create policy "own bonus answer readable" on public.bonus_answers for select using (auth.uid() = user_id);
create policy "others bonus answers readable after lock" on public.bonus_answers for select using (
  exists(select 1 from public.bonus_questions q where q.id = question_id and public.is_game_member(q.game_id, auth.uid()) and q.lock_at <= now())
);
create policy "insert own bonus answer when open" on public.bonus_answers for insert to authenticated with check (
  auth.uid() = user_id and public.is_bonus_open(question_id)
);
create policy "update own bonus answer when open" on public.bonus_answers for update using (auth.uid() = user_id and public.is_bonus_open(question_id)) with check (auth.uid()=user_id and public.is_bonus_open(question_id));

-- When admin settles a bonus question (status -> settled with correct_answer), award points
create or replace function public.settle_bonus_question()
returns trigger language plpgsql security definer set search_path=public as $$
declare uids uuid[];
begin
  if new.status = 'settled' and new.correct_answer is not null then
    update public.bonus_answers ba
      set points = case when ba.answer::text = new.correct_answer::text then new.points else 0 end
      where ba.question_id = new.id;

    select array_agg(distinct user_id) into uids from public.bonus_answers where question_id = new.id;
    if uids is not null then
      update public.profiles p set total_points = coalesce(
        (select sum(points) from public.predictions where user_id = p.id and points is not null), 0
      ) + coalesce(
        (select sum(points) from public.bonus_answers where user_id = p.id and points is not null), 0
      )
      where p.id = any(uids);
    end if;
  end if;
  return new;
end; $$;
create trigger bonus_settle_trigger after update on public.bonus_questions
  for each row when (new.status = 'settled' and (old.status is distinct from new.status or old.correct_answer is distinct from new.correct_answer))
  execute function public.settle_bonus_question();

-- ============ API SYNC LOGS ============
create table public.api_sync_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  status text not null,
  message text,
  synced_count int,
  created_at timestamptz not null default now()
);
alter table public.api_sync_logs enable row level security;
create policy "admins read sync logs" on public.api_sync_logs for select using (public.has_role(auth.uid(),'admin'));
