import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { afterEach, describe, expect, it } from "vitest";

import { productionRepo } from "@/repo/production";
import { signIn, signOut } from "@/repo/supabase";

// L6 T4a: production stores report versions. Runs against the bankintelli-test project, seeded by
// `supabase/seed.sql`, as org B's investigator saving versions of org B's report RPT-B1; nothing here
// deletes, because no client may.
const env = loadEnv("test", process.cwd(), "");
const run = Date.now().toString(36);
const client = async (who: "ANALYST" | "INVESTIGATOR") => {
  const db = createClient(
    env["VITE_SUPABASE_URL"] ?? "",
    env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
    {
      auth: { persistSession: false },
    },
  );
  const { error } = await db.auth.signInWithPassword({
    email: env[`TEST_${who}_EMAIL`] ?? "",
    password: env[`TEST_${who}_PASSWORD`] ?? "",
  });
  if (error) throw error;
  return db;
};

async function snapshotOfB1() {
  await signIn(env["TEST_INVESTIGATOR_EMAIL"] ?? "", env["TEST_INVESTIGATOR_PASSWORD"] ?? "");
  const { investigations, reports } = await productionRepo.investigations.read();
  const report = reports.find((r) => r.id === "RPT-B1")!;
  const inv = investigations.find((i) => i.id === "INV-B1")!;
  return { report, inv, finance: { run } as never, issues: [], actions: [], audit: [] };
}

describe("report versions in production (L6 T4a)", () => {
  afterEach(() => signOut());

  it("stores each version, numbered and named by the server, and reads it back", async () => {
    const snapshot = await snapshotOfB1();
    const first = await productionRepo.reports.save("RPT-B1", snapshot);
    const second = await productionRepo.reports.save("RPT-B1", snapshot);
    expect(second.version).toBe(first.version + 1);
    expect(first.savedBy).toBeTruthy();
    const { versions } = await productionRepo.reports.read();
    const mine = versions.filter((v) => v.report === "RPT-B1").map((v) => v.version);
    expect(mine).toEqual(expect.arrayContaining([first.version, second.version]));
    const { data } = await (
      await client("INVESTIGATOR")
    )
      .from("report_versions")
      .select("snapshot")
      .eq("report", "RPT-B1")
      .eq("version", second.version)
      .single();
    expect((data?.snapshot as { finance: { run: string } }).finance.run).toBe(run);
  });

  it("refuses a snapshot of another report", async () => {
    const snapshot = await snapshotOfB1();
    await expect(productionRepo.reports.save("RPT-A1", snapshot)).rejects.toThrow(/RPT-B1/);
  });

  it("keeps a version from being changed, deleted, or read by another org", async () => {
    const saved = await productionRepo.reports.save("RPT-B1", await snapshotOfB1());
    const b = await client("INVESTIGATOR");
    const at = () =>
      b
        .from("report_versions")
        .select("snapshot")
        .eq("report", "RPT-B1")
        .eq("version", saved.version);
    const before = (await at()).data;
    await b
      .from("report_versions")
      .update({ snapshot: {} })
      .eq("report", "RPT-B1")
      .eq("version", saved.version);
    await b.from("report_versions").delete().eq("report", "RPT-B1").eq("version", saved.version);
    expect((await at()).data).toEqual(before);
    expect(before).toHaveLength(1);
    const a = await client("ANALYST");
    expect((await a.from("report_versions").select("version").eq("report", "RPT-B1")).data).toEqual(
      [],
    );
  });
});
