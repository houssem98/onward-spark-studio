-- Persistence: the records the workspace changes live here. The server, never the client, sets each
-- row's org and each approval's and audit event's author and time.
create function private.my_name() returns text
  language sql stable security definer set search_path = ''
as $$ select name from public.profiles where id = (select auth.uid()) $$;

create function private.may_approve() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('reviewer', 'model_validator', 'admin')
  )
$$;

revoke execute on function private.my_name(), private.may_approve() from public, anon;
grant execute on function private.my_name(), private.may_approve() to authenticated;

alter table public.investigations
  alter column org_id set default private.my_org(),
  add column question text not null default '',
  add column module text not null default '',
  add column department text not null default '',
  add column owner text not null default '',
  add column created text not null default '',
  add column period text not null default '',
  add column priority text not null default 'Medium',
  add column status text not null default 'Draft',
  add column state text not null default 'UNVERIFIED',
  add column report text,
  add column outstanding integer not null default 0,
  add column findings jsonb not null default '[]',
  add column contradictions jsonb not null default '[]',
  add column limitations jsonb not null default '[]';

-- `title` holds the action's text.
alter table public.actions
  alter column id set default 'ACT-' || substr(gen_random_uuid()::text, 1, 8),
  alter column org_id set default private.my_org(),
  add column finding text not null default '',
  add column owner text not null default '',
  add column due text not null default '',
  add column priority text not null default 'Medium',
  add column status text not null default 'Open',
  add column outcome text not null default '',
  add column evidence text;

alter table public.reports
  alter column org_id set default private.my_org(),
  add column owner text not null default '',
  add column period text not null default '',
  add column investigation text,
  add column state text not null default 'UNVERIFIED',
  add column status text not null default 'Draft',
  add column updated text not null default current_date::text;

alter table public.audit_events
  alter column id set default gen_random_uuid()::text,
  alter column org_id set default private.my_org(),
  add column at timestamptz not null default now(),
  add column actor text not null default coalesce(private.my_name(), 'system'),
  add column module text not null default '',
  add column entity text not null default '',
  add column action text not null default '';

create table public.approvals (
  id text primary key default gen_random_uuid()::text,
  org_id uuid not null default private.my_org() references public.orgs (id),
  model text not null,
  decision text not null check (decision in ('Approved', 'Rejected')),
  decided_by text not null default private.my_name(),
  at timestamptz not null default now(),
  comment text not null default ''
);
alter table public.approvals enable row level security;
revoke all on public.approvals from anon, authenticated;
grant select on public.approvals to authenticated;

grant insert (id, title, question, module, department, owner, created, period, priority, status, state,
  report, outstanding, findings, contradictions, limitations) on public.investigations to authenticated;
grant update (status) on public.investigations to authenticated;
grant insert (title, finding, owner, due, priority, status, outcome, evidence) on public.actions to authenticated;
grant update (finding, owner, due, priority, status, outcome, evidence) on public.actions to authenticated;
grant insert (id, title, owner, period, investigation, state, status, updated) on public.reports to authenticated;
grant insert (module, entity, action, detail) on public.audit_events to authenticated;
grant insert (model, decision, comment) on public.approvals to authenticated;

create policy "add to own org" on public.investigations for insert to authenticated
  with check (org_id = (select private.my_org()) and (select private.may_write()) and (select private.session_active()));
create policy "add to own org" on public.actions for insert to authenticated
  with check (org_id = (select private.my_org()) and (select private.may_write()) and (select private.session_active()));
create policy "add to own org" on public.reports for insert to authenticated
  with check (org_id = (select private.my_org()) and (select private.may_write()) and (select private.session_active()));
create policy "log in own org" on public.audit_events for insert to authenticated
  with check (org_id = (select private.my_org()) and (select private.session_active()));
create policy "read own org" on public.approvals for select to authenticated
  using (org_id = (select private.my_org()) and (select private.session_active()));
create policy "approve in own org" on public.approvals for insert to authenticated
  with check (org_id = (select private.my_org()) and (select private.may_approve()) and (select private.session_active()));
