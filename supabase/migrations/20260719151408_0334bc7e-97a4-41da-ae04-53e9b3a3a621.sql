
-- 1. Lägg till nya enum-värden
ALTER TYPE public.bonus_type ADD VALUE IF NOT EXISTS 'number_closest';
ALTER TYPE public.bonus_type ADD VALUE IF NOT EXISTS 'composite';
