-- Separation of duties: work is submitted before it is decided; its submitter never approves it, admins
-- included; and each submission takes one decision, so a second approval, or an approval after a
-- rejection, is refused.
create table public.submissions (
  kind text not null check (kind in ('model', 'report', 'action')),
  subject text not null,
  org_id uuid not null default private.my_org() references public.orgs (id),
  submitted_by uuid not null default auth.uid() references auth.users (id),
  at timestamptz not null default now(),
  primary key (kind, subject)
);
alter table public.submissions enable row level security;
revoke all on public.submissions from anon, authenticated;
grant select on public.submissions to authenticated;
grant insert (kind, subject) on public.submissions to authenticated;

create policy "read own org" on public.submissions for select to authenticated
  using (org_id = (select private.my_org()) and (select private.session_active()));
create policy "submit in own org" on public.submissions for insert to authenticated
  with check (
    org_id = (select private.my_org())
    and submitted_by = (select auth.uid())
    and (select private.session_active())
  );

-- T4's synthetic test decisions predate submissions and repeat one subject; each keeps its row under a
-- subject of its own. They also predate `decided_by_id`, which every new decision gets from the server.
update public.approvals set model = model || '-' || id where model = 'MDL-T';

alter table public.approvals rename column model to subject;
alter table public.approvals
  add column kind text not null default 'model' check (kind in ('model', 'report', 'action')),
  add column decided_by_id uuid default auth.uid() references auth.users (id),
  add constraint one_decision unique (kind, subject);
grant insert (kind) on public.approvals to authenticated;

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
  );

create or replace trigger audit after insert on public.approvals
  for each row execute function private.audit_change('Approvals', 'subject', 'comment');
create trigger audit after insert on public.submissions
  for each row execute function private.audit_change('Submissions', 'subject', 'kind');
