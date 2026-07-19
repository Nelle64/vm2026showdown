
CREATE OR REPLACE FUNCTION public.admin_set_bonus_answer_points(_answer_id uuid, _points int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  _game_id uuid;
  _uid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select q.game_id, ba.user_id
    into _game_id, _uid
  from public.bonus_answers ba
  join public.bonus_questions q on q.id = ba.question_id
  where ba.id = _answer_id;
  if _game_id is null then
    raise exception 'answer not found';
  end if;
  if not public.is_game_admin(_game_id, auth.uid()) then
    raise exception 'not admin';
  end if;
  update public.bonus_answers set points = _points where id = _answer_id;
  update public.profiles p set total_points = coalesce(
    (select sum(points) from public.bonus_answers where user_id = p.id), 0
  ) + coalesce(
    (select sum(points) from public.predictions where user_id = p.id), 0
  )
  where p.id = _uid;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_bonus_answer_points(uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_bonus_answer_points(uuid, int) TO authenticated;
