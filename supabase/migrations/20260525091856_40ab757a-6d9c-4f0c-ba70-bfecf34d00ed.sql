
create type public.join_request_status as enum ('pending','approved','rejected');

create table public.game_join_requests (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null,
  user_id uuid not null,
  status public.join_request_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid,
  unique (game_id, user_id)
);

create index idx_gjr_game on public.game_join_requests(game_id);
create index idx_gjr_user on public.game_join_requests(user_id);

alter table public.game_join_requests enable row level security;

-- User creates own request, only if not already member
create policy "create own join request"
on public.game_join_requests for insert to authenticated
with check (
  auth.uid() = user_id
  and not public.is_game_member(game_id, auth.uid())
);

-- User reads own requests
create policy "read own join request"
on public.game_join_requests for select to authenticated
using (auth.uid() = user_id);

-- User can cancel/delete own pending request
create policy "delete own pending request"
on public.game_join_requests for delete to authenticated
using (auth.uid() = user_id and status = 'pending');

-- Game admin reads requests for their game
create policy "admin reads game requests"
on public.game_join_requests for select to authenticated
using (public.is_game_admin(game_id, auth.uid()));

-- Game admin updates (approve/reject) requests
create policy "admin updates game requests"
on public.game_join_requests for update to authenticated
using (public.is_game_admin(game_id, auth.uid()))
with check (public.is_game_admin(game_id, auth.uid()));

-- Trigger: on approval, insert into game_members
create or replace function public.handle_approved_join_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    insert into public.game_members (game_id, user_id, is_admin)
    values (new.game_id, new.user_id, false)
    on conflict do nothing;
    new.decided_at := now();
    new.decided_by := auth.uid();
  elsif new.status = 'rejected' and (old.status is distinct from 'rejected') then
    new.decided_at := now();
    new.decided_by := auth.uid();
  end if;
  return new;
end; $$;

create trigger trg_handle_approved_join_request
before update on public.game_join_requests
for each row execute function public.handle_approved_join_request();
