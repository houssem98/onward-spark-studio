import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { reconcileBridge, round } from "@/lib/calc";
import { answer, metricLabel } from "@/lib/copilot";
import { DEMO_ENTITY } from "@/lib/evidence";
import { catalogOf, resolveScope } from "@/lib/scope";
import { demoRepo } from "@/repo/demo";
import { open, setUp } from "./a11y";

setUp();

// The synthetic credit-vs-peer case, end to end through the demo adapter (L5 T2). Every number and
// state is written out here, never recomputed by the code under test: a change to the case changes
// this file, in review.
const Q = "Why did our credit division revenue grow more slowly than our competitors this year?";
const COHORT = ["harborline", "meridian", "cascade"];

const read = async () => ({
  finance: await demoRepo.finance.read(),
  models: await demoRepo.models.read(),
  datasets: await demoRepo.datasets.read(),
  crime: await demoRepo.crime.read(),
});

describe("golden case: credit revenue vs peers, FY2025", () => {
  it("resolves the question, takes the benchmark from its cohort and reconciles the bridge with an explicit residual", async () => {
    const { finance } = await read();
    expect(resolveScope(Q, catalogOf(finance, DEMO_ENTITY))).toMatchObject({
      kind: "resolved",
      scope: { department: "credit", period: "FY2025", currency: "USD", cohort: COHORT },
    });
    const cohort = COHORT.map((id) => finance.peers.find((p) => p.id === id)!);
    expect(cohort.map((p) => [p.creditRevenue, p.comparability])).toEqual([
      [152, "High"],
      [146, "High"],
      [151, "Medium"],
    ]);
    expect(round((152 + 146 + 151) / 3, 1)).toBe(149.7);

    const bridge = finance.bridges.find((b) => b.id === "peer")!;
    expect([bridge.base, bridge.actual, bridge.period]).toEqual([150, 120, "FY2025"]);
    expect(finance.departments.find((d) => d.id === "credit")!.revenue).toBe(120);
    expect(bridge.steps.map((s) => [s.label, s.value, s.kind])).toEqual([
      ["Volume", -18, "measured"],
      ["Pricing", -7, "measured"],
      ["Product mix", -3, "measured"],
      ["Other / unexplained", -2, "residual"],
    ]);
    expect(reconcileBridge(bridge)).toEqual({
      gap: -30,
      explained: -30,
      difference: 0,
      reconciles: true,
    });

    // The note shown under the bridge states the same figures and the cohort's real comparability.
    for (const text of ["Harborline 152", "Meridian 146", "Cascade 151", "149.7", "150"])
      expect(finance.peerBenchmarkNote).toContain(text);
    expect(finance.peerBenchmarkNote).not.toMatch(/high-comparability peers/i);
  });

  it("splits the findings into measured and hypothesis, each measured figure the bridge step it claims", async () => {
    const { investigations, reports } = await demoRepo.investigations.read();
    const inv = investigations.find((i) => i.id === "INV-2025-014")!;
    expect([inv.question, inv.department, inv.period]).toEqual([Q, "Credit", "FY2025"]);
    expect(
      inv.findings.map((f) => [f.id, f.kind, f.impact ?? null, f.facts?.claimed ?? null, f.state]),
    ).toEqual([
      ["F-014-1", "Measured", "−$18.0M", -18, "NOT_AVAILABLE"],
      ["F-014-2", "Measured", "−$7.0M", -7, "NOT_AVAILABLE"],
      ["F-014-3", "Measured", "−$3.0M", -3, "PARTIALLY_VERIFIED"],
      ["F-014-4", "Hypothesis", null, null, "HYPOTHESIS"],
      ["F-014-5", "Measured", "−$2.0M", -2, "NOT_AVAILABLE"],
    ]);
    expect(inv.findings[0]!.claim).toContain("−$18.0M of the −$30.0M gap");
    expect(inv.findings[4]!.facts?.calculation).toEqual({ output: -2, reproduced: -2 });
    expect([inv.state, inv.status, inv.outstanding, inv.report]).toEqual([
      "PARTIALLY_VERIFIED",
      "Pending Review",
      2,
      "RPT-FY25-PERF",
    ]);
    expect(reports.find((r) => r.id === inv.report)).toMatchObject({
      state: "PARTIALLY_VERIFIED",
      synthetic: true,
    });

    // Figures a finding states that no source gives (the 14bp yield gap, the 1.4-day starting
    // point) sit only on findings the policy keeps short of confirmed; the 1.8 days is the funnel's.
    expect(inv.findings[1]!.claim).toContain("14bp");
    expect(inv.findings[3]!.evidence).toBe("Underwriting time rose from 1.4 to 1.8 days");
    const { funnel } = await demoRepo.credit.read();
    expect(funnel.find((s) => s.stage === "Underwriting")!.days).toBe(1.8);
  });

  it("keeps the year-on-year contradiction and the missing peer funding cost in view, in the answer and on the investigation", async () => {
    const data = await read();
    const prior = data.finance.bridges.find((b) => b.id === "prior")!;
    expect(prior.steps.find((s) => s.label === "Volume")!.value).toBe(9);

    const a = answer(Q, data);
    expect(a.metrics.map((m) => [metricLabel(m), m.value])).toEqual([
      ["Credit revenue FY2025", "$120.0M"],
      ["Credit revenue growth", "5.3%"],
      ["Peer benchmark", "$150.0M"],
      ["Revenue gap to peer benchmark", "−$30.0M · reconciles"],
    ]);
    expect(a.summary).toEqual([
      "Measured: volume −$18.0M, pricing −$7.0M, product mix −$3.0M; residual −$2.0M unexplained.",
      "Hypothesis (unverified): SME underwriting delays may have reduced originations.",
      "Contradiction: volume grew +$9.0M year on year — the shortfall is relative to peers.",
    ]);
    expect(a.missing).toContain("Peer funding costs not available");
    expect(a.state).toBe("NOT_AVAILABLE");

    await open("/investigations/INV-2025-014");
    const panel = (title: string) =>
      screen.getByRole("heading", { name: title }).closest("section")!.textContent;
    expect(panel("Contradictory evidence")).toContain("+$9.0M year on year");
    expect(panel("Limitations")).toMatch(/peer funding costs are not available/i);
  }, 30_000);
});
