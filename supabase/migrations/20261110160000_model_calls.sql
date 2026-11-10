-- L7 T2b: the cost of each model call, so the month's spend survives restarts (the human's choice,
-- 2026-11-10). Only the server writes it, with the service-role key; no client may read or write it.
create table public.model_calls (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  model text not null,
  usd numeric(12, 6) not null check (usd >= 0)
);

create index model_calls_at on public.model_calls (at);

alter table public.model_calls enable row level security;
revoke all on public.model_calls from anon, authenticated;
