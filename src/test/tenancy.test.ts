import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { beforeAll, describe, expect, it } from "vitest";

// Runs against the bankintelli-test project, seeded by `supabase/seed.sql`: one synthetic record per
// table in each of two orgs. Org A's user is a credit analyst, org B's an investigator, so a refusal
// of org B is the tenant check, not a missing role.
const env = loadEnv("test", process.cwd(), "");
const client = () =>
  createClient(env["VITE_SUPABASE_URL"] ?? "", env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "", {
    auth: { persistSession: false },
  });
const orgA = client();
const orgB = client();

const tables = [
  { table: "investigations", text: "title", a: "INV-A1", b: "INV-B1" },
  { table: "reports", text: "title", a: "RPT-A1", b: "RPT-B1" },
  { table: "actions", text: "title", a: "ACT-A1", b: "ACT-B1" },
  { table: "audit_events", text: "detail", a: "AUD-A1", b: "AUD-B1" },
] as const;

beforeAll(async () => {
  for (const [db, who] of [
    [orgA, "ANALYST"],
    [orgB, "INVESTIGATOR"],
  ] as const) {
    const { error } = await db.auth.signInWithPassword({
      email: env[`TEST_${who}_EMAIL`] ?? "",
      password: env[`TEST_${who}_PASSWORD`] ?? "",
    });
    if (error) throw error;
  }
});

describe.each(tables)("$table", ({ table, text, a, b }) => {
  it("org B cannot read org A's record by id", async () => {
    expect((await orgA.from(table).select("id").eq("id", a)).data).toEqual([{ id: a }]);
    expect((await orgB.from(table).select("id").eq("id", a)).data).toEqual([]);
  });

  it("org B cannot update org A's record by id", async () => {
    const { data } = await orgB
      .from(table)
      .update({ [text]: "changed by org B" })
      .eq("id", a)
      .select();
    expect(data ?? []).toEqual([]);
    const { data: kept } = await orgA.from(table).select(text).eq("id", a).single();
    expect(kept).not.toEqual({ [text]: "changed by org B" });
  });

  it("org B cannot find org A's record by search", async () => {
    expect((await orgA.from(table).select("id").ilike(text, "%Alpha%")).data).toEqual([{ id: a }]);
    expect((await orgB.from(table).select("id").ilike(text, "%Alpha%")).data).toEqual([]);
    expect((await orgB.from(table).select("id").ilike(text, "%Bravo%")).data).toEqual([{ id: b }]);
  });

  it("org B cannot export org A's record by id", async () => {
    expect((await orgA.from(table).select().eq("id", a).csv()).data).toContain(a);
    expect((await orgB.from(table).select().eq("id", a).csv()).data ?? "").not.toContain(a);
  });
});

describe("roles", () => {
  it("only an investigator, reviewer or admin changes a record, and never an audit event", async () => {
    const own = await orgB
      .from("investigations")
      .update({ title: "Bravo case" })
      .eq("id", "INV-B1")
      .select("id");
    expect(own.data).toEqual([{ id: "INV-B1" }]);
    const analyst = await orgA
      .from("investigations")
      .update({ title: "Alpha case" })
      .eq("id", "INV-A1")
      .select("id");
    expect(analyst.data ?? []).toEqual([]);
    const audit = await orgB
      .from("audit_events")
      .update({ detail: "Bravo edit" })
      .eq("id", "AUD-B1")
      .select("id");
    expect(audit.data ?? []).toEqual([]);
  });
});
