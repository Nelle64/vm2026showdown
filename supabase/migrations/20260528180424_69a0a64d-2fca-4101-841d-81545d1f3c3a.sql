
CREATE OR REPLACE FUNCTION public.is_any_game_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select exists(
    select 1 from public.game_members where user_id = _user_id and is_admin = true
  ) or exists(
    select 1 from public.games where owner_id = _user_id
  )
$$;

CREATE POLICY "game admins update matches"
ON public.matches FOR UPDATE
USING (public.is_any_game_admin(auth.uid()))
WITH CHECK (public.is_any_game_admin(auth.uid()));
