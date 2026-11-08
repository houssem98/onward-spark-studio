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

async function migrated() {
  const db = new PGlite();
  await db.exec(PLATFORM);
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  return db;
}

it("every migration and the seed apply cleanly to an empty database", async () => {
  const db = await migrated();
  const { rows } = await db.query(
    "select (select count(*) from public.investigations)::int as investigations, (select count(*) from public.approvals)::int as approvals",
  );
  expect(rows).toEqual([{ investigations: 2, approvals: 0 }]);
  await db.close();
}, 60_000);

it("audit events stay append-only, even for the database's owner", async () => {
  const db = await migrated();
  const count = async () =>
    (await db.query<{ n: number }>("select count(*)::int as n from public.audit_events")).rows[0]
      ?.n;
  const before = await count();
  expect(before).toBeGreaterThan(0);
  await expect(db.exec("update public.audit_events set detail = 'edited'")).rejects.toThrow(
    /append-only/,
  );
  await expect(db.exec("delete from public.audit_events")).rejects.toThrow(/append-only/);
  await expect(db.exec("truncate public.audit_events")).rejects.toThrow(/append-only/);
  expect(await count()).toBe(before);
  await db.close();
}, 60_000);
