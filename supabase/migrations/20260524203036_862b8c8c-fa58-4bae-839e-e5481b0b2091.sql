-- 1. Privilege escalation: lås is_admin vid självjoin
DROP POLICY IF EXISTS "join self into game" ON public.game_members;
CREATE POLICY "join self into game"
ON public.game_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_admin = false);

-- 2. Realtime: minska exponering – behåll bara matches (publik data)
ALTER PUBLICATION supabase_realtime DROP TABLE public.predictions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.bonus_answers;
ALTER PUBLICATION supabase_realtime DROP TABLE public.bonus_questions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;

-- 3. Storage: ta bort bred SELECT på avatars (filerna nås ändå via publik URL i public bucket)
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;

-- 4. Återkalla EXECUTE från anon på interna säkerhetsfunktioner
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_game_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_game_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_match_locked(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_bonus_open(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.compute_points(integer, integer, integer, integer) FROM anon;