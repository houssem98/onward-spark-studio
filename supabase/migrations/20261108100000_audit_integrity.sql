-- Audit integrity: events are append-only for everyone, the database's owner included. Each carries its
-- actor's authority, an outcome and a correlation id (the request's `x-correlation-id`, else a new
-- one). Every change to a record and every export attempt writes its event in the same transaction.
create function private.my_role() returns text
  language sql stable security definer set search_path = ''
as $$ select role::text from public.profiles where id = (select auth.uid()) $$;

create function private.may_export() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('executive', 'reviewer', 'model_validator', 'admin')
  )
$$;

revoke execute on function private.my_role(), private.may_export() from public, anon;
grant execute on function private.my_role(), private.may_export() to authenticated;

alter table public.audit_events
  add column authority text not null default coalesce(private.my_role(), 'system'),
  add column outcome text not null default 'succeeded' check (outcome in ('succeeded', 'refused')),
  add column correlation_id text not null default coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'x-correlation-id',
    gen_random_uuid()::text
  );

create function private.append_only() returns trigger
  language plpgsql set search_path = ''
as $$ begin raise exception 'audit events are append-only'; end $$;

create trigger append_only before update or delete on public.audit_events
  for each row execute function private.append_only();
create trigger append_only_truncate before truncate on public.audit_events
  for each statement execute function private.append_only();

-- Arguments: module, the column naming the entity, the column a creation's detail comes from.
create function private.audit_change() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  rec jsonb := to_jsonb(new);
  changed text;
begin
  if tg_op = 'UPDATE' then
    select string_agg(n.key, ', ' order by n.key) into changed
    from jsonb_each(rec) n
    where n.value is distinct from to_jsonb(old) -> n.key;
  end if;
  insert into public.audit_events (org_id, module, entity, action, detail)
  values (
    new.org_id, tg_argv[0], rec ->> tg_argv[1],
    case when tg_op = 'UPDATE' then 'Updated' else coalesce(rec ->> 'decision', 'Created') end,
    case when tg_op = 'UPDATE' then coalesce(changed, '') else coalesce(rec ->> tg_argv[2], '') end
  );
  return null;
end $$;

create trigger audit after insert or update on public.investigations
  for each row execute function private.audit_change('Investigations', 'id', 'question');
create trigger audit after insert or update on public.actions
  for each row execute function private.audit_change('Investigations', 'id', 'title');
create trigger audit after insert or update on public.reports
  for each row execute function private.audit_change('Reports', 'id', 'title');
create trigger audit after insert on public.approvals
  for each row execute function private.audit_change('Models', 'model', 'comment');

-- Records every export attempt and answers whether it may go ahead. A refusal returns false instead of
-- raising, so its event is kept.
create function public.record_export(p_entity text, p_detail text) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare
  allowed boolean := private.may_export();
begin
  if private.my_org() is null or not private.session_active() then
    return false;
  end if;
  insert into public.audit_events (org_id, module, entity, action, detail, outcome)
  values (
    private.my_org(), 'Export', p_entity, 'Exported', p_detail,
    case when allowed then 'succeeded' else 'refused' end
  );
  return allowed;
end $$;

revoke execute on function public.record_export(text, text) from public, anon;
grant execute on function public.record_export(text, text) to authenticated;
