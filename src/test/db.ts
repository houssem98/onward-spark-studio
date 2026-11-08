import { readdirSync, readFileSync } from "node:fs";

import { PGlite } from "@electric-sql/pglite";

// Supabase provides these; an empty Postgres does not.
const PLATFORM = `
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key);
  create table auth.sessions (id uuid primary key);
  create function auth.uid() returns uuid language sql as 'select null::uuid';
  create function auth.jwt() returns jsonb language sql as 'select ''{}''::jsonb';
`;

/** An empty Postgres built from every migration in order, and seeded unless told not to be. */
export async function migrated({ seed = true } = {}) {
  const db = new PGlite();
  await db.exec(PLATFORM);
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  if (seed) await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  return db;
}
