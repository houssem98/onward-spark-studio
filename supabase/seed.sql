-- Synthetic records for the bankintelli-test project only: one per table in each of two orgs.
-- Test users are created apart, with passwords generated in Postgres and kept in `.env.test.local`.
insert into public.orgs (id, name) values
  ('00000000-0000-4000-8000-00000000000a', 'Synthetic Bank Alpha'),
  ('00000000-0000-4000-8000-00000000000b', 'Synthetic Bank Bravo');

insert into public.investigations values
  ('INV-A1', '00000000-0000-4000-8000-00000000000a', 'Alpha case'),
  ('INV-B1', '00000000-0000-4000-8000-00000000000b', 'Bravo case');
insert into public.reports values
  ('RPT-A1', '00000000-0000-4000-8000-00000000000a', 'Alpha report'),
  ('RPT-B1', '00000000-0000-4000-8000-00000000000b', 'Bravo report');
insert into public.actions values
  ('ACT-A1', '00000000-0000-4000-8000-00000000000a', 'Alpha action'),
  ('ACT-B1', '00000000-0000-4000-8000-00000000000b', 'Bravo action');
insert into public.audit_events values
  ('AUD-A1', '00000000-0000-4000-8000-00000000000a', 'Alpha event'),
  ('AUD-B1', '00000000-0000-4000-8000-00000000000b', 'Bravo event');
