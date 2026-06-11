CREATE POLICY "game admins can read all predictions in their game"
ON public.predictions
FOR SELECT
TO authenticated
USING (public.is_game_admin(game_id, auth.uid()));