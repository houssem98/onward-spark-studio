-- L6 T3: each run of a live source's connector, so its last success survives restarts (the human's
-- choice, 2026-11-10). Only the server writes it, with the service-role key; no client may read or
-- write it.
create table public.source_runs (
  id bigint generated always as identity primary key,
  source text not null,
  at timestamptz not null default now(),
  ok boolean not null,
  detail text not null default ''
);

create index source_runs_at on public.source_runs (at desc);

alter table public.source_runs enable row level security;
revoke all on public.source_runs from anon, authenticated;
