CREATE OR REPLACE FUNCTION public.get_bonus_answerers(_question_id uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
declare
  _game_id uuid;
begin
  select q.game_id into _game_id from public.bonus_questions q where q.id = _question_id;
  if _game_id is null then
    return;
  end if;
  if not public.is_game_member(_game_id, auth.uid()) then
    return;
  end if;
  return query
    select ba.user_id, p.display_name, p.avatar_url
    from public.bonus_answers ba
    left join public.profiles p on p.id = ba.user_id
    where ba.question_id = _question_id
    order by p.display_name nulls last;
end;
$$;

GRANT EXECUTE ON FUNCTION public.get_bonus_answerers(uuid) TO authenticated;