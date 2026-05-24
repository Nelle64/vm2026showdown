
-- Add search_path to remaining functions
create or replace function public.compute_points(p_home int, p_away int, r_home int, r_away int)
returns int language sql immutable set search_path = public as $$
  select case
    when p_home is null or p_away is null or r_home is null or r_away is null then 0
    when p_home = r_home and p_away = r_away then 3
    when sign(p_home - p_away) = sign(r_home - r_away) then 1
    else 0
  end
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end; $$;

-- Restrict SECURITY DEFINER helpers from anon
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.is_game_member(uuid, uuid) from anon, public;
revoke execute on function public.is_game_admin(uuid, uuid) from anon, public;
revoke execute on function public.is_match_locked(uuid) from anon, public;
revoke execute on function public.is_bonus_open(uuid) from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_game_member(uuid, uuid) to authenticated;
grant execute on function public.is_game_admin(uuid, uuid) to authenticated;
grant execute on function public.is_match_locked(uuid) to authenticated;
grant execute on function public.is_bonus_open(uuid) to authenticated;
