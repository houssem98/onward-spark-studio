-- L7 T6e (the council's F11): each model call carries the caller's organisation, so one
-- organisation's admin sees and is alerted on its own month only. Demo calls have none. Applied by
-- the human, like every migration.
alter table public.model_calls add column org_id uuid references public.orgs (id);

create index model_calls_org_at on public.model_calls (org_id, at);
