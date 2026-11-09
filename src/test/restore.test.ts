import { pgDump } from "@electric-sql/pglite-tools/pg_dump";
import type { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

import { migrated } from "./db";

// The procedure in docs/ops/BACKUP_RESTORE.md, end to end: dump a database's data, rebuild an empty
// one from the migrations, load the dump with triggers off, and get the same rows back.
const TABLES = [
  "orgs",
  "profiles",
  "investigations",
  "actions",
  "reports",
  "audit_events",
  "submissions",
  "approvals",
];
const ALPHA = "00000000-0000-4000-8000-00000000000a";
const MAKER = "11111111-1111-4111-8111-111111111111";
const CHECKER = "22222222-2222-4222-8222-222222222222";

const snapshot = async (db: PGlite) =>
  Object.fromEntries(
    await Promise.all(
      TABLES.map(async (t) => [
        t,
        (await db.query(`select to_jsonb(r) as row from public.${t} r order by 1`)).rows,
      ]),
    ),
  );

it("a data dump restores into an empty database rebuilt from the migrations, row for row", async () => {
  const source = await migrated();
  await source.exec(`
    insert into auth.users (id) values ('${MAKER}'), ('${CHECKER}');
    insert into public.profiles (id, name, role, org_id) values
      ('${MAKER}', 'Restore Maker', 'investigator', '${ALPHA}'),
      ('${CHECKER}', 'Restore Checker', 'reviewer', '${ALPHA}');
    insert into public.investigations (id, org_id, title, question, findings) values
      ('INV-R1', '${ALPHA}', 'Restore case', 'Does it survive a restore?', '[{"id": "F-R1", "state": "UNVERIFIED"}]');
    insert into public.submissions (kind, subject, org_id, submitted_by) values
      ('report', 'RPT-A1', '${ALPHA}', '${MAKER}');
    insert into public.approvals (kind, subject, org_id, decision, decided_by, decided_by_id, comment)
      values ('report', 'RPT-A1', '${ALPHA}', 'Approved', 'Restore Checker', '${CHECKER}', 'Restored');
  `);
  const before = await snapshot(source);
  expect(before["audit_events"]!.length).toBeGreaterThan(2);

  // The test runs under jsdom, whose File has no text(); its FileReader reads one.
  const file = await pgDump({ pg: source, args: ["--data-only", "--inserts"] });
  const dump = await new Promise<string>((done) => {
    const reader = new FileReader();
    reader.onload = () => done(reader.result as string);
    reader.readAsText(file);
  });
  const target = await migrated({ seed: false });
  await target.exec(
    `set session_replication_role = replica;\n${dump}\nset session_replication_role = origin;`,
  );

  expect(await snapshot(target)).toEqual(before);
  await expect(target.exec("delete from public.audit_events")).rejects.toThrow(/append-only/);
  await source.close();
  await target.close();
}, 120_000);
