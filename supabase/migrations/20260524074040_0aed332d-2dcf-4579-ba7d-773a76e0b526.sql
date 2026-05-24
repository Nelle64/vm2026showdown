ALTER TYPE public.bonus_type ADD VALUE IF NOT EXISTS 'multiple_choice';

ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bonus_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bonus_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;