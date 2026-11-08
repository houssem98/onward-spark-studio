-- Tenancy: every record belongs to one org. A user reads and searches only their own org's records,
-- changes them only as an investigator, reviewer or admin, and never changes an audit event.
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null
);
alter table public.orgs enable row level security;
revoke all on public.orgs from anon, authenticated;

alter table public.profiles add column org_id uuid references public.orgs (id);

create function private.my_org() returns uuid
  language sql stable security definer set search_path = ''
as $$ select org_id from public.profiles where id = (select auth.uid()) $$;

create function private.may_write() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('investigator', 'reviewer', 'admin')
  )
$$;

revoke execute on function private.my_org(), private.may_write() from public, anon;
grant execute on function private.my_org(), private.may_write() to authenticated;

create table public.investigations (id text primary key, org_id uuid not null references public.orgs (id), title text not null);
create table public.reports (id text primary key, org_id uuid not null references public.orgs (id), title text not null);
create table public.actions (id text primary key, org_id uuid not null references public.orgs (id), title text not null);
create table public.audit_events (id text primary key, org_id uuid not null references public.orgs (id), detail text not null);

alter table public.investigations enable row level security;
alter table public.reports enable row level security;
alter table public.actions enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.investigations, public.reports, public.actions, public.audit_events from anon, authenticated;
grant select on public.investigations, public.reports, public.actions, public.audit_events to authenticated;
grant update (title) on public.investigations, public.reports, public.actions to authenticated;

create policy "read own org" on public.investigations for select to authenticated
  using (org_id = (select private.my_org()) and (select private.session_active()));
create policy "read own org" on public.reports for select to authenticated
  using (org_id = (select private.my_org()) and (select private.session_active()));
create policy "read own org" on public.actions for select to authenticated
  using (org_id = (select private.my_org()) and (select private.session_active()));
create policy "read own org" on public.audit_events for select to authenticated
  using (org_id = (select private.my_org()) and (select private.session_active()));

create policy "write own org" on public.investigations for update to authenticated
  using (org_id = (select private.my_org()) and (select private.may_write()) and (select private.session_active()));
create policy "write own org" on public.reports for update to authenticated
  using (org_id = (select private.my_org()) and (select private.may_write()) and (select private.session_active()));
create policy "write own org" on public.actions for update to authenticated
  using (org_id = (select private.my_org()) and (select private.may_write()) and (select private.session_active()));
