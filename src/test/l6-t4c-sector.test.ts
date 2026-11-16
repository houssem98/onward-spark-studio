import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Investigation, Report } from "@/data/investigations";
import { withPolicyStates } from "@/lib/evidence-policy";
import { buildReport } from "@/lib/report";
import { readSector } from "@/lib/tn-connector.server";
import { LISTED_BANKS } from "@/lib/tn-filings";
import { openSectorInvestigation, sectorInvestigation } from "@/lib/tn-investigation";
import { demoRepo } from "@/repo/demo";
import { productionRepo } from "@/repo/production";
import { signIn, signOut } from "@/repo/supabase";

// L6 T4c: the listed banks' latest quarter as an investigation and its report. Recorded on 2026-11-10:
// BIAT's listing and statement and the BCT's rate; every other bank's listing answers 404 here.
const rec = (f: string) => readFileSync(`src/test/recorded/tn/${f}`);
const ok = (body: BodyInit) => new Response(body, { status: 200 });
const recorded = vi.fn<typeof fetch>(async (u) => {
  const url = String(u);
  if (url.includes("bct.gov.tn")) return ok(rec("bct-usd-2026-09-30.html"));
  if (url.endsWith(".pdf")) return ok(rec("biat-q3-2026.pdf"));
  if (url.includes("type_societe=3126")) return ok(rec("biat-listing.html"));
  return new Response("", { status: 404 });
});
const TODAY = "2026-11-10";
const read = () =>
  readSector({ fetch: recorded, sleep: async () => {}, now: () => new Date(`${TODAY}T09:00:00Z`) });
const env = loadEnv("test", process.cwd(), "");
const run = Date.now().toString(36).toUpperCase();

describe("the sector investigation (L6 T4c)", () => {
  afterEach(() => signOut());

  it("makes each read bank's figure a finding the policy assesses against its filing", async () => {
    const { inv, report } = sectorInvestigation(await read(), {
      suffix: "T1",
      owner: "Test Investigator",
      today: TODAY,
    });
    const biat = inv.findings.filter((f) => f.entity === "BIAT");
    expect(biat.map((f) => f.metricId).sort()).toEqual([
      "bank_equity",
      "customer_deposits",
      "net_banking_income",
      "net_loans",
    ]);
    const nbi = biat.find((f) => f.metricId === "net_banking_income")!;
    expect(nbi.claim).toMatch(/415\.1 USD M/);
    expect(nbi.source).toMatch(/\.pdf$/);
    expect(withPolicyStates(inv, TODAY).findings.find((f) => f.id === nbi.id)!.state).toBe(
      "VERIFIED",
    );
    expect(inv.findings).toHaveLength(4);
    expect(inv.limitations.filter((l) => / not read: /.test(l))).toHaveLength(
      Object.keys(LISTED_BANKS).length - 1,
    );
    expect(report).toMatchObject({ investigation: inv.id, owner: "Test Investigator" });
    expect(inv.report).toBe(report.id);
  });

  it("builds its report from the investigation, naming each filing", async () => {
    const { inv, report } = sectorInvestigation(await read(), {
      suffix: "T2",
      owner: "Test Investigator",
      today: TODAY,
    });
    const doc = buildReport({
      report,
      inv: withPolicyStates(inv, TODAY),
      issues: [],
      actions: [],
      audit: [],
      notice: "",
    });
    const section = (t: string) => doc.sections.find((x) => x.title.endsWith(`. ${t}`))!.lines;
    expect(section("Root-cause findings").join("\n")).toMatch(
      /· verified · BIAT Net banking income: 415\.1 USD M/,
    );
    expect(section("Evidence and source register").join("\n")).toMatch(
      /BIAT quarterly indicators to 2026-09-30 · regulatory · BIAT/,
    );
  });

  it("is stored in production, its states set by the policy on every read", async () => {
    await signIn(env["TEST_INVESTIGATOR_EMAIL"] ?? "", env["TEST_INVESTIGATOR_PASSWORD"] ?? "");
    const { inv, report } = sectorInvestigation(await read(), {
      suffix: `T-${run}`,
      owner: "Test Investigator",
      today: new Date().toISOString().slice(0, 10),
    });
    await productionRepo.investigations.create(inv);
    await productionRepo.reports.create(report);
    const back = await productionRepo.investigations.read();
    expect(back.reports.map((r) => r.id)).toContain(report.id);
    const stored = back.investigations.find((i) => i.id === inv.id)!;
    expect(stored.findings.map((f) => f.state)).toContain("VERIFIED");
    const raw = createClient(
      env["VITE_SUPABASE_URL"] ?? "",
      env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
      {
        auth: { persistSession: false },
      },
    );
    await raw.auth.signInWithPassword({
      email: env["TEST_INVESTIGATOR_EMAIL"] ?? "",
      password: env["TEST_INVESTIGATOR_PASSWORD"] ?? "",
    });
    const { data } = await raw.from("investigations").select("findings").eq("id", inv.id).single();
    expect(JSON.stringify(data?.findings)).not.toMatch(/"state":"VERIFIED"/);
    const v = await productionRepo.reports.save(report.id, {
      report,
      inv: stored,
      issues: [],
      actions: [],
      audit: [],
    });
    expect(v.snapshot.inv.findings).toHaveLength(inv.findings.length);
  });

  it("opens the investigation and its report in one step", async () => {
    const create = vi.fn(async () => {});
    const createReport = vi.fn(async () => {});
    const repo = {
      ...demoRepo,
      investigations: { ...demoRepo.investigations, create },
      reports: { ...demoRepo.reports, create: createReport },
    };
    const id = await openSectorInvestigation(repo, await read(), "Test Investigator");
    const [[inv]] = create.mock.calls as unknown as [[Investigation]];
    const [[report]] = createReport.mock.calls as unknown as [[Report]];
    expect([report.id, report.investigation, inv.report]).toEqual([id, inv.id, id]);
    expect(inv.findings).toHaveLength(4);
  });
});
