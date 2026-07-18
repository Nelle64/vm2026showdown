
DELETE FROM public.round_matches WHERE match_id IN ('6448cc3f-321d-42c1-bb45-b6a26601fd92','e168aa94-f279-4973-b081-81797b8d9969');
DELETE FROM public.predictions WHERE match_id IN ('6448cc3f-321d-42c1-bb45-b6a26601fd92','e168aa94-f279-4973-b081-81797b8d9969');
DELETE FROM public.matches WHERE id IN ('6448cc3f-321d-42c1-bb45-b6a26601fd92','e168aa94-f279-4973-b081-81797b8d9969');
-- Remove placeholder teams no longer used
DELETE FROM public.teams WHERE code IN ('L93','L94','W101','W102') AND NOT EXISTS (
  SELECT 1 FROM public.matches m WHERE m.home_team_id = teams.id OR m.away_team_id = teams.id
);
