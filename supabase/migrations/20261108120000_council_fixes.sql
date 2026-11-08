-- Council fixes (L3 T8a). Every finding below was reproduced against the test project before this.

-- F2: only the database writes audit events (its triggers and record_export); a client no longer can.
revoke insert on public.audit_events from authenticated;

-- F13: each event names its actor's user id beside the display name.
-- F8: a blank x-correlation-id counts as none. Three synthetic events already hold a blank one and,
-- being append-only, keep it, so the check covers new events only.
alter table public.audit_events
  add column actor_id uuid default auth.uid(),
  alter column correlation_id set default coalesce(
    nullif(nullif(current_setting('request.headers', true), '')::json ->> 'x-correlation-id', ''),
    gen_random_uuid()::text
  ),
  add constraint correlation_id_present check (correlation_id <> '') not valid;

-- F3: ids, submissions and decisions are unique within an org, so one org can neither block nor
-- probe another's. Only the key constraints change; no row does.
alter table public.investigations drop constraint investigations_pkey, add primary key (org_id, id);
alter table public.reports drop constraint reports_pkey, add primary key (org_id, id);
alter table public.submissions drop constraint submissions_pkey, add primary key (org_id, kind, subject);
alter table public.approvals
  drop constraint one_decision,
  add constraint one_decision unique (org_id, kind, subject);

-- F5: the server records who made each report and action, a report or action can be submitted only
-- if it exists in the org, and its maker never approves it.
alter table public.reports add column created_by uuid default auth.uid();
alter table public.actions add column created_by uuid default auth.uid();

alter policy "submit in own org" on public.submissions
  with check (
    org_id = (select private.my_org())
    and submitted_by = (select auth.uid())
    and (select private.session_active())
    and (
      kind = 'model'
      or exists (
        select 1 from public.reports r
        where submissions.kind = 'report' and r.org_id = submissions.org_id and r.id = submissions.subject
      )
      or exists (
        select 1 from public.actions a
        where submissions.kind = 'action' and a.org_id = submissions.org_id and a.id = submissions.subject
      )
    )
  );

alter policy "approve in own org" on public.approvals
  with check (
    org_id = (select private.my_org())
    and (select private.may_approve())
    and (select private.session_active())
    and exists (
      select 1 from public.submissions s
      where s.kind = approvals.kind
        and s.subject = approvals.subject
        and s.org_id = approvals.org_id
        and s.submitted_by <> (select auth.uid())
    )
    and not exists (
      select 1 from public.reports r
      where approvals.kind = 'report' and r.org_id = approvals.org_id and r.id = approvals.subject
        and r.created_by = (select auth.uid())
    )
    and not exists (
      select 1 from public.actions a
      where approvals.kind = 'action' and a.org_id = approvals.org_id and a.id = approvals.subject
        and a.created_by = (select auth.uid())
    )
  );

-- F11: a session past its not_after is over, even before its token expires.
create or replace function private.session_active() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions
    where id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and (not_after is null or not_after > now())
  );
$$;

-- F12: lists must be lists and statuses known values. Three synthetic rows written while the council's
-- finding was reproduced hold an object for a list; they are emptied first.
update public.investigations
set findings = case when jsonb_typeof(findings) = 'array' then findings else '[]' end,
    contradictions = case when jsonb_typeof(contradictions) = 'array' then contradictions else '[]' end,
    limitations = case when jsonb_typeof(limitations) = 'array' then limitations else '[]' end
where jsonb_typeof(findings) <> 'array'
   or jsonb_typeof(contradictions) <> 'array'
   or jsonb_typeof(limitations) <> 'array';

alter table public.investigations
  add constraint lists_are_lists check (
    jsonb_typeof(findings) = 'array'
    and jsonb_typeof(contradictions) = 'array'
    and jsonb_typeof(limitations) = 'array'
  ),
  add constraint known_status check (status in ('Draft', 'In Progress', 'Pending Review', 'Approved', 'Closed')),
  add constraint known_priority check (priority in ('Critical', 'High', 'Medium', 'Low')),
  add constraint known_state check (
    state in ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING_EVIDENCE', 'NOT_AVAILABLE')
  );
alter table public.actions
  add constraint known_priority check (priority in ('High', 'Medium', 'Low')),
  add constraint known_status check (status in ('Open', 'In Progress', 'Done'));
alter table public.reports
  add constraint known_state check (
    state in ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING_EVIDENCE', 'NOT_AVAILABLE')
  );
