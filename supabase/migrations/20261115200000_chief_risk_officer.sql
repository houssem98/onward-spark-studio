-- L7 T6c (the council's F12): the chief risk officer, whom the model-spend alert serves (L7 T1), had
-- no role in production. Applied by the human, like every migration.
alter type public.app_role add value if not exists 'chief_risk_officer';
