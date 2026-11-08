import { expect, it } from "vitest";

import { migrated } from "./db";

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

const ALPHA = "00000000-0000-4000-8000-00000000000a";
const BRAVO = "00000000-0000-4000-8000-00000000000b";
const USER = "33333333-3333-4333-8333-333333333333";

it("keeps ids and submissions unique within an org, so two orgs may use the same one", async () => {
  const db = await migrated({ seed: false });
  await db.exec(`
    insert into public.orgs (id, name) values ('${ALPHA}', 'One'), ('${BRAVO}', 'Two');
    insert into auth.users (id) values ('${USER}');
    insert into public.investigations (id, org_id, title) values ('SAME', '${ALPHA}', 'x');
    insert into public.reports (id, org_id, title) values ('SAME', '${ALPHA}', 'x');
    insert into public.submissions (kind, subject, org_id, submitted_by) values ('model', 'SAME', '${ALPHA}', '${USER}');
  `);
  await expect(
    db.exec(`
      insert into public.investigations (id, org_id, title) values ('SAME', '${BRAVO}', 'x');
      insert into public.reports (id, org_id, title) values ('SAME', '${BRAVO}', 'x');
      insert into public.submissions (kind, subject, org_id, submitted_by) values ('model', 'SAME', '${BRAVO}', '${USER}');
    `),
  ).resolves.toBeDefined();
  await db.close();
}, 60_000);

it("refuses a session past its not_after", async () => {
  const db = await migrated({ seed: false });
  const live = "44444444-4444-4444-8444-444444444444";
  const expired = "55555555-5555-4555-8555-555555555555";
  await db.exec(
    `insert into auth.sessions (id, not_after) values ('${live}', null), ('${expired}', now() - interval '1 minute')`,
  );
  const active = async (session: string) => {
    await db.query("select set_config('request.jwt.claims', $1, false)", [
      JSON.stringify({ session_id: session }),
    ]);
    return (await db.query<{ a: boolean }>("select private.session_active() as a")).rows[0]?.a;
  };
  expect(await active(live)).toBe(true);
  expect(await active(expired)).toBe(false);
  await db.close();
}, 60_000);

it("refuses a record whose lists are not lists or whose status is unknown", async () => {
  const db = await migrated();
  const insert = (values: string) =>
    db.exec(
      `insert into public.investigations (id, org_id, title, findings, status) values ${values}`,
    );
  await expect(insert(`('BAD-1', '${ALPHA}', 'x', '{}', 'Draft')`)).rejects.toThrow();
  await expect(insert(`('BAD-2', '${ALPHA}', 'x', '[]', 'Bogus')`)).rejects.toThrow();
  await expect(insert(`('GOOD', '${ALPHA}', 'x', '[]', 'Draft')`)).resolves.toBeDefined();
  await db.close();
}, 60_000);

it("lets only a recorded approval make a report Approved, in its own org, and nothing an investigation", async () => {
  const db = await migrated();
  await expect(
    db.exec(
      `insert into public.investigations (id, org_id, title, status) values ('BY-HAND', '${ALPHA}', 'x', 'Approved')`,
    ),
  ).rejects.toThrow(/approval/);
  await expect(
    db.exec(`update public.investigations set status = 'Approved' where id = 'INV-A1'`),
  ).rejects.toThrow(/approval/);
  await expect(
    db.exec(
      `insert into public.reports (id, org_id, title, status) values ('BY-HAND', '${ALPHA}', 'x', 'Approved')`,
    ),
  ).rejects.toThrow(/approval/);
  await db.exec(`
    insert into auth.users (id) values ('${USER}');
    insert into public.reports (id, org_id, title) values ('RPT-A1', '${BRAVO}', 'same id');
    insert into public.submissions (kind, subject, org_id, submitted_by) values ('report', 'RPT-A1', '${ALPHA}', '${USER}');
    insert into public.approvals (kind, subject, org_id, decision, decided_by) values ('report', 'RPT-A1', '${ALPHA}', 'Approved', 'Checker');
  `);
  const { rows } = await db.query(
    "select org_id, status from public.reports where id = 'RPT-A1' order by org_id",
  );
  expect(rows).toEqual([
    { org_id: ALPHA, status: "Approved" },
    { org_id: BRAVO, status: "Draft" },
  ]);
  await db.close();
}, 60_000);
