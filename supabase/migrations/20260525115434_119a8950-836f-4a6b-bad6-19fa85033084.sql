create or replace function public.request_join_by_code(_code text)
returns table(game_id uuid, game_name text, status public.join_request_status, already_member boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  _game_id uuid;
  _game_name text;
  _uid uuid := auth.uid();
  _request_status public.join_request_status;
  _already_member boolean;
begin
  if _uid is null then
    raise exception 'not authenticated';
  end if;

  select g.id, g.name
    into _game_id, _game_name
  from public.games as g
  where g.invite_code = upper(trim(_code))
  limit 1;

  if _game_id is null then
    raise exception 'invalid code';
  end if;

  _already_member := public.is_game_member(_game_id, _uid);

  if _already_member then
    return query
      select _game_id, _game_name, 'approved'::public.join_request_status, true;
    return;
  end if;

  select gjr.status
    into _request_status
  from public.game_join_requests as gjr
  where gjr.game_id = _game_id
    and gjr.user_id = _uid
  limit 1;

  if _request_status is null then
    insert into public.game_join_requests (game_id, user_id)
    values (_game_id, _uid)
    returning game_join_requests.status into _request_status;
  end if;

  return query
    select _game_id, _game_name, _request_status, false;
end;
$$;