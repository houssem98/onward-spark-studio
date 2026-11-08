import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { afterEach, describe, expect, it } from "vitest";

import type { Investigation } from "@/data/investigations";
import { productionRepo } from "@/repo/production";
import { signIn, signOut } from "@/repo/supabase";

// Runs against the bankintelli-test project as Bravo's users. Each run writes rows under its own
// tag; nothing here deletes, because no client may.
const env = loadEnv("test", process.cwd(), "");
const run = Date.now().toString(36);
const as = (who: "INVESTIGATOR" | "VALIDATOR") =>
  signIn(env[`TEST_${who}_EMAIL`] ?? "", env[`TEST_${who}_PASSWORD`] ?? "");

/** A second client with its own session, so a read back comes from the server, not this one's memory. */
async function fresh() {
  const db = createClient(
    env["VITE_SUPABASE_URL"] ?? "",
    env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
    {
      auth: { persistSession: false },
    },
  );
  await db.auth.signInWithPassword({
    email: env["TEST_INVESTIGATOR_EMAIL"] ?? "",
    password: env["TEST_INVESTIGATOR_PASSWORD"] ?? "",
  });
  return db;
}

describe("persistence", () => {
  afterEach(() => signOut());

  it("an investigation and its status change outlive the client that made them", async () => {
    await as("INVESTIGATOR");
    const inv: Investigation = {
      id: `INV-T-${run}`,
      title: `Persistence ${run}`,
      question: "Does a created investigation survive a reload?",
      module: "Performance",
      department: "Credit",
      owner: "Test Investigator",
      created: "2026-11-08",
      period: "FY2025",
      priority: "Low",
      status: "Draft",
      state: "UNVERIFIED",
      outstanding: 0,
      findings: [],
      contradictions: [],
      limitations: [],
    };
    await productionRepo.investigations.create(inv);
    await productionRepo.investigations.setStatus(inv.id, "In Progress");
    const { data } = await (
      await fresh()
    )
      .from("investigations")
      .select()
      .eq("id", inv.id)
      .single();
    expect(data).toMatchObject({ ...inv, status: "In Progress" });
    const read = await productionRepo.investigations.read();
    expect(read.investigations.find((i) => i.id === inv.id)?.status).toBe("In Progress");
  });

  it("an action and its update outlive the client that made them", async () => {
    await as("INVESTIGATOR");
    await productionRepo.investigations.addAction({
      action: `Persisted action ${run}`,
      finding: "F-T-1",
      owner: "Test Investigator",
      due: "2026-12-01",
      priority: "Low",
      status: "Open",
      outcome: "Read back by a fresh client",
    });
    const { actions } = await productionRepo.investigations.read();
    const made = actions.find((a) => a.action === `Persisted action ${run}`);
    expect(made?.id).toBeTruthy();
    await productionRepo.investigations.updateAction(made!.id, { status: "Done" });
    const { data } = await (
      await fresh()
    )
      .from("actions")
      .select("status")
      .eq("id", made!.id)
      .single();
    expect(data).toEqual({ status: "Done" });
  });

  it("a report draft outlives the client that made it", async () => {
    await as("INVESTIGATOR");
    const draft = { id: `RPT-T-${run}`, title: `Draft ${run}`, status: "Draft" };
    const { error } = await (await fresh()).from("reports").insert(draft);
    expect(error).toBeNull();
    const { reports } = await productionRepo.investigations.read();
    expect(reports.find((r) => r.id === draft.id)).toMatchObject(draft);
  });

  it("an approval outlives its client and names the approver the server knows", async () => {
    const submitted = await (
      await fresh()
    )
      .from("submissions")
      .insert({ kind: "model", subject: `MDL-T-${run}` });
    expect(submitted.error).toBeNull();
    await as("VALIDATOR");
    await productionRepo.models.decide(`MDL-T-${run}`, "Approved", `Approved in run ${run}`);
    const { data } = await (
      await fresh()
    )
      .from("approvals")
      .select("model:subject, decision, by:decided_by")
      .eq("comment", `Approved in run ${run}`)
      .single();
    expect(data).toEqual({ model: `MDL-T-${run}`, decision: "Approved", by: "Test Validator" });
  });

  it("an audit event outlives its client, and the client cannot choose its actor", async () => {
    await as("INVESTIGATOR");
    await productionRepo.audit.log("Investigations", `INV-T-${run}`, "Viewed", `Audit ${run}`);
    const events = await productionRepo.audit.read();
    expect(events.find((e) => e.detail === `Audit ${run}`)).toMatchObject({
      actor: "Test Investigator",
      module: "Investigations",
      action: "Viewed",
    });
    const spoof = await (await fresh()).from("audit_events").insert({
      module: "Investigations",
      entity: "x",
      action: "Viewed",
      detail: "spoof",
      actor: "Someone else",
    });
    expect(spoof.error).not.toBeNull();
  });
});
