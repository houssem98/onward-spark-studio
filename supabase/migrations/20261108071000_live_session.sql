-- The data API checks only a token's signature and expiry, so a token outlives its sign-out by up to
-- an hour. Every policy also requires the token's session to still exist.
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.session_active() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions where id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  );
$$;
revoke execute on function private.session_active() from public, anon;
grant execute on function private.session_active() to authenticated;

alter policy "read own profile" on public.profiles
  using (id = (select auth.uid()) and (select private.session_active()));
