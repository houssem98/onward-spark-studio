-- L6 T4a: production stores report versions, as the demo does since L5 T4. A version is immutable: no
-- client may change or delete one. The server numbers it, names who saved it, and audits the save.
create table public.report_versions (
  report text not null,
  version int not null,
  org_id uuid not null default private.my_org() references public.orgs (id),
  saved_at timestamptz not null default now(),
  saved_by text not null,
  snapshot jsonb not null,
  primary key (org_id, report, version),
  foreign key (org_id, report) references public.reports (org_id, id)
);

alter table public.report_versions enable row level security;
revoke all on public.report_versions from anon, authenticated;
grant select on public.report_versions to authenticated;
grant insert (report, snapshot) on public.report_versions to authenticated;

create policy "read own org" on public.report_versions for select to authenticated
  using (org_id = (select private.my_org()) and (select private.session_active()));
create policy "add to own org" on public.report_versions for insert to authenticated
  with check (
    org_id = (select private.my_org()) and (select private.may_write()) and (select private.session_active())
  );

create function private.number_version() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.org_id::text || new.report));
  select coalesce(max(version), 0) + 1 into new.version
  from public.report_versions where org_id = new.org_id and report = new.report;
  select name into new.saved_by from public.profiles where id = (select auth.uid());
  new.saved_at := now();
  return new;
end $$;

create function private.immutable_version() returns trigger
  language plpgsql set search_path = ''
as $$ begin raise exception 'report versions are immutable'; end $$;

create trigger number_version before insert on public.report_versions
  for each row execute function private.number_version();
create trigger immutable before update or delete on public.report_versions
  for each row execute function private.immutable_version();
create trigger audit after insert on public.report_versions
  for each row execute function private.audit_change('Reports', 'report', 'version');
