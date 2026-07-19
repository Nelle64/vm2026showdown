CREATE POLICY "Admins can read all bonus answers in their games"
ON public.bonus_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bonus_questions q
    WHERE q.id = bonus_answers.question_id
      AND public.is_game_admin(q.game_id, auth.uid())
  )
);