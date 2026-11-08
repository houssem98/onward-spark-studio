-- Identity: each user's name and role live on the server; a client can read its own row and write none.
create type public.app_role as enum (
  'executive', 'credit_analyst', 'investigator', 'reviewer', 'model_validator', 'admin'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role public.app_role not null
);

alter table public.profiles enable row level security;
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;

create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
