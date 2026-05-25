
create or replace function public.request_join_by_code(_code text)
returns table(game_id uuid, game_name text, status public.join_request_status, already_member boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  _game_id uuid;
  _name text;
  _uid uuid := auth.uid();
  _status public.join_request_status;
  _is_member boolean;
begin
  if _uid is null then
    raise exception 'not authenticated';
  end if;

  select g.id, g.name into _game_id, _name
  from public.games g
  where g.invite_code = upper(trim(_code));

  if _game_id is null then
    raise exception 'invalid code';
  end if;

  select public.is_game_member(_game_id, _uid) into _is_member;

  if _is_member then
    return query select _game_id, _name, 'approved'::public.join_request_status, true;
    return;
  end if;

  insert into public.game_join_requests (game_id, user_id)
  values (_game_id, _uid)
  on conflict (game_id, user_id) do update set status = game_join_requests.status
  returning game_join_requests.status into _status;

  return query select _game_id, _name, _status, false;
end; $$;

revoke execute on function public.request_join_by_code(text) from anon;
grant execute on function public.request_join_by_code(text) to authenticated;
