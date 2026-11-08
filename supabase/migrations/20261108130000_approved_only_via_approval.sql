-- Approved only through an approval (L3 T8c, the human's T8b decision on council F6). No client writes
-- "Approved" into an investigation's or a report's status; recording a report's approval sets that
-- report Approved in the same transaction. Rows already Approved keep their status.
create function private.refuse_approved() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if new.status = 'Approved' and (tg_op = 'INSERT' or old.status is distinct from 'Approved') then
    raise exception 'only a recorded approval makes work Approved';
  end if;
  return new;
end $$;

-- Clients may update an investigation's status, but only insert a report's, so the report needs no
-- update trigger, and the approval below, an update, passes.
create trigger refuse_approved before insert or update of status on public.investigations
  for each row execute function private.refuse_approved();
create trigger refuse_approved before insert on public.reports
  for each row execute function private.refuse_approved();

create function private.approve_report() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  update public.reports set status = 'Approved' where org_id = new.org_id and id = new.subject;
  return null;
end $$;

create trigger approve_report after insert on public.approvals
  for each row when (new.kind = 'report' and new.decision = 'Approved')
  execute function private.approve_report();
