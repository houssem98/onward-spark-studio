import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { describe, expect, it } from "vitest";

// Runs against the bankintelli-test project as Bravo's users: the validator may export, the
// investigator may not.
const env = loadEnv("test", process.cwd(), "");
const run = Date.now().toString(36);

async function as(who: "INVESTIGATOR" | "VALIDATOR") {
  const db = createClient(
    env["VITE_SUPABASE_URL"] ?? "",
    env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
    { auth: { persistSession: false } },
  );
  const { error } = await db.auth.signInWithPassword({
    email: env[`TEST_${who}_EMAIL`] ?? "",
    password: env[`TEST_${who}_PASSWORD`] ?? "",
  });
  if (error) throw error;
  return db;
}

const FIELDS = "actor, authority, action, entity, outcome, correlation_id";

describe("audit", () => {
  it("a client can neither update nor delete an audit event", async () => {
    const db = await as("INVESTIGATOR");
    const before = (await db.from("audit_events").select("*").eq("id", "AUD-B1").single()).data;
    expect(before).toMatchObject({ id: "AUD-B1" });
    const update = await db
      .from("audit_events")
      .update({ detail: "edited" })
      .eq("id", "AUD-B1")
      .select();
    expect(update.data ?? []).toEqual([]);
    const remove = await db.from("audit_events").delete().eq("id", "AUD-B1").select();
    expect(remove.data ?? []).toEqual([]);
    expect((await db.from("audit_events").select("*").eq("id", "AUD-B1").single()).data).toEqual(
      before,
    );
  });

  it("each export writes one event carrying actor, authority, outcome and correlation id", async () => {
    const db = await as("VALIDATOR");
    const file = `inventory-${run}.csv`;
    const { data: allowed } = await db
      .rpc("record_export", { p_entity: file, p_detail: "Model inventory" })
      .setHeader("x-correlation-id", `corr-${run}`);
    expect(allowed).toBe(true);
    const { data } = await db.from("audit_events").select(FIELDS).eq("entity", file);
    expect(data).toEqual([
      {
        actor: "Test Validator",
        authority: "model_validator",
        action: "Exported",
        entity: file,
        outcome: "succeeded",
        correlation_id: `corr-${run}`,
      },
    ]);
  });

  it("an export without permission is refused and still audited", async () => {
    const db = await as("INVESTIGATOR");
    const file = `refused-${run}.csv`;
    const { data: allowed } = await db.rpc("record_export", {
      p_entity: file,
      p_detail: "Case list",
    });
    expect(allowed).toBe(false);
    const { data } = await db.from("audit_events").select(FIELDS).eq("entity", file);
    expect(data).toEqual([
      expect.objectContaining({
        authority: "investigator",
        action: "Exported",
        outcome: "refused",
      }),
    ]);
    expect(data?.[0]?.correlation_id).toBeTruthy();
  });

  it("a change writes exactly one audit event in its own transaction", async () => {
    const db = await as("INVESTIGATOR");
    const { data: made } = await db
      .from("actions")
      .insert({ title: `Audited action ${run}`, finding: "F-T-2" })
      .select("id")
      .single();
    const { data } = await db
      .from("audit_events")
      .select(FIELDS)
      .eq("entity", made?.id ?? "");
    expect(data).toEqual([
      expect.objectContaining({
        actor: "Test Investigator",
        authority: "investigator",
        action: "Created",
        outcome: "succeeded",
      }),
    ]);
  });
});
