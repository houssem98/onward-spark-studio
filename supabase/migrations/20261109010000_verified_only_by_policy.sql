-- Evidence states (L4 T4). DRAFT and HYPOTHESIS join the set, and nothing writes VERIFIED into a
-- record or its findings by hand: only the evidence policy may, and it does not run in the database
-- yet, so until it does nothing new reaches VERIFIED here. Rows already VERIFIED keep their state.
alter table public.investigations
  drop constraint known_state,
  add constraint known_state check (
    state in ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING_EVIDENCE', 'NOT_AVAILABLE', 'DRAFT', 'HYPOTHESIS')
  );
alter table public.reports
  drop constraint known_state,
  add constraint known_state check (
    state in ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING_EVIDENCE', 'NOT_AVAILABLE', 'DRAFT', 'HYPOTHESIS')
  );

create function private.refuse_verified() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if new.state = 'VERIFIED' and (tg_op = 'INSERT' or old.state is distinct from 'VERIFIED') then
    raise exception 'only the evidence policy sets VERIFIED';
  end if;
  if tg_table_name = 'investigations' then
    if jsonb_path_exists(new.findings, '$[*] ? (@.state == "VERIFIED")')
      and (tg_op = 'INSERT' or not jsonb_path_exists(old.findings, '$[*] ? (@.state == "VERIFIED")')) then
      raise exception 'only the evidence policy sets VERIFIED';
    end if;
  end if;
  return new;
end $$;

create trigger refuse_verified before insert or update of state, findings on public.investigations
  for each row execute function private.refuse_verified();
create trigger refuse_verified before insert or update of state on public.reports
  for each row execute function private.refuse_verified();
