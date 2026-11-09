-- Evidence council C7 and C8 (L4 T6a). Every finding names one of the seven states, so none is
-- missing or spelled another way ("Verified"), and a VERIFIED finding is refused unless that same
-- finding was VERIFIED before, so none can be added beside one that already is.
create or replace function private.refuse_verified() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if new.state = 'VERIFIED' and (tg_op = 'INSERT' or old.state is distinct from 'VERIFIED') then
    raise exception 'only the evidence policy sets VERIFIED';
  end if;
  -- Reports have no findings, so their row may not be asked for one.
  if tg_table_name <> 'investigations' then
    return new;
  end if;
  if jsonb_typeof(new.findings) = 'array' then
    if exists (
      select 1 from jsonb_array_elements(new.findings) f
      where coalesce(f ->> 'state', '') not in
        ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING_EVIDENCE', 'NOT_AVAILABLE', 'DRAFT', 'HYPOTHESIS')
    ) then
      raise exception 'a finding needs one of the seven evidence states';
    end if;
    if exists (
      select 1 from jsonb_array_elements(new.findings) f
      where f ->> 'state' = 'VERIFIED'
        and (tg_op = 'INSERT' or jsonb_typeof(old.findings) <> 'array' or not exists (
          select 1 from jsonb_array_elements(old.findings) o
          where o ->> 'id' = f ->> 'id' and o ->> 'state' = 'VERIFIED'
        ))
    ) then
      raise exception 'only the evidence policy sets VERIFIED';
    end if;
  end if;
  return new;
end $$;
