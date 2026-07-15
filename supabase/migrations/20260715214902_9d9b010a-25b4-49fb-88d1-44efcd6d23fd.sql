
INSERT INTO public.teams (external_id, code, name, flag_emoji) VALUES
  ('manual-l93', 'L93', 'Förlorare match 93', '🏳️'),
  ('manual-l94', 'L94', 'Förlorare match 94', '🏳️'),
  ('manual-w101', 'W101', 'Vinnare match 101', '🏳️'),
  ('manual-w102', 'W102', 'Vinnare match 102', '🏳️')
ON CONFLICT (external_id) DO NOTHING;

INSERT INTO public.matches (external_id, home_team_id, away_team_id, kickoff_at, status, stage, group_letter, venue)
SELECT 'manual-bronze',
  (SELECT id FROM public.teams WHERE external_id='manual-l93'),
  (SELECT id FROM public.teams WHERE external_id='manual-l94'),
  '2026-07-18 21:00:00+00', 'scheduled', 'knockout', NULL, 'Bronsmatch'
ON CONFLICT (external_id) DO NOTHING;

INSERT INTO public.matches (external_id, home_team_id, away_team_id, kickoff_at, status, stage, group_letter, venue)
SELECT 'manual-final',
  (SELECT id FROM public.teams WHERE external_id='manual-w101'),
  (SELECT id FROM public.teams WHERE external_id='manual-w102'),
  '2026-07-19 19:00:00+00', 'scheduled', 'knockout', NULL, 'VM-final'
ON CONFLICT (external_id) DO NOTHING;
