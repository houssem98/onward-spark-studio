import { readdirSync, readFileSync } from "node:fs";

import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

// Supabase provides these; an empty Postgres does not.
const PLATFORM = `
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key);
  create table auth.sessions (id uuid primary key);
  create function auth.uid() returns uuid language sql as 'select null::uuid';
  create function auth.jwt() returns jsonb language sql as 'select ''{}''::jsonb';
`;

it("every migration and the seed apply cleanly to an empty database", async () => {
  const db = new PGlite();
  await db.exec(PLATFORM);
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  const { rows } = await db.query(
    "select (select count(*) from public.investigations)::int as investigations, (select count(*) from public.approvals)::int as approvals",
  );
  expect(rows).toEqual([{ investigations: 2, approvals: 0 }]);
  await db.close();
}, 60_000);
