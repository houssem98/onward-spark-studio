import { describe, expect, it } from "vitest";

import { assessCase, caseAssessment, CASES } from "@/data/crime";
import type { Investigation } from "@/data/investigations";
import { DEMO_DATE } from "@/lib/definitions";
import { DEMO_ENTITY, FigureSchema, type Source } from "@/lib/evidence";
import { assignEvidenceState, findingAssessment, type Assessment } from "@/lib/evidence-policy";
import { demoRepo } from "@/repo/demo";
import { handWrittenStates } from "./state-scan";

// L4 T6a: the council's findings on the policy and the repository, one test each.
const ledger: Source = {
  id: "DS-001",
  name: "DS-001 General ledger",
  authority: "internal",
  entity: DEMO_ENTITY,
  period: "FY2025",
  asOf: "2026-01-10",
  freshForDays: 30,
  unit: "USD M",
  licence: "Synthetic demo data",
  version: "1",
};
const verified: Assessment = {
  claim: { id: "C", text: "Revenue was 1,240", kind: "measured" },
  claimed: 1240,
  scope: { entity: DEMO_ENTITY, period: "FY2025" },
  sources: [ledger],
  values: [{ sourceId: "DS-001", value: 1240 }],
  today: DEMO_DATE,
};
const state = (a: Assessment) => assignEvidenceState(a).state;
const inv = async (id: string) =>
  (await demoRepo.investigations.read()).investigations.find((i) => i.id === id)!;

describe("council fixes in the policy and the repository (L4 T6a)", () => {
  it("C1: stores and shows the policy's states, not the states a writer hands in", async () => {
    const base = await inv("INV-2026-002");
    await demoRepo.investigations.create({
      ...base,
      id: "INV-HAND-1",
      state: "NOT_AVAILABLE",
      findings: base.findings.map((f) => ({ ...f, state: "UNVERIFIED" })),
    });
    const back = await inv("INV-HAND-1");
    expect([back.state, back.findings.map((f) => f.state)]).toEqual([
      "CONFLICTING_EVIDENCE",
      ["CONFLICTING_EVIDENCE"],
    ]);
  });

  it("C2: shows a case's evidence in the policy's state whatever an update writes", async () => {
    await demoRepo.crime.updateCase(
      "CASE-0921",
      { evidence: [{ id: "EV-9", label: "x", state: "VERIFIED", source: "none" }] },
      "forged",
    );
    const c = (await demoRepo.crime.read()).cases.find((x) => x.id === "CASE-0921")!;
    expect(c.evidence.map((e) => [e.id, e.state])).toEqual([["EV-9", "UNVERIFIED"]]);
  });

  it("C5: keeps a record's own claim, scope and date whatever its facts carry", () => {
    const f = {
      id: "F",
      claim: "x",
      kind: "Hypothesis" as const,
      period: "FY2025",
      facts: {
        sources: [ledger],
        today: "1900-01-01",
        claim: { id: "F", text: "x", kind: "measured" },
        scope: { entity: "Other", period: "X" },
      } as never,
    };
    const a = findingAssessment(f);
    expect([a.today, a.claim.kind, a.scope.entity]).toEqual([DEMO_DATE, "hypothesis", DEMO_ENTITY]);
    const e = caseAssessment({
      id: "E",
      label: "x",
      facts: { sources: [], today: "1900-01-01" } as never,
    });
    expect(e.today).toBe(DEMO_DATE);
  });

  it("C5: ignores a source that does not parse", () => {
    expect(state({ ...verified, sources: [{ ...ledger, asOf: "not a date" }] })).toBe("UNVERIFIED");
  });

  it("C10: does not count a source dated after the assessment as fresh", () => {
    expect(state({ ...verified, sources: [{ ...ledger, asOf: "2099-01-01" }] })).toBe(
      "PARTIALLY_VERIFIED",
    );
  });

  it("C12: compares a calculation's output with the claim and its sources", () => {
    expect(state({ ...verified, calculation: { output: 5, reproduced: 5 } })).toBe(
      "CONFLICTING_EVIDENCE",
    );
  });

  it("C13: makes every figure agree with every other, not only with the first", () => {
    const two = {
      ...verified,
      claimed: 1000,
      sources: [ledger, { ...ledger, id: "DS-009" }],
      values: [
        { sourceId: "DS-001", value: 1005 },
        { sourceId: "DS-009", value: 995 },
      ],
    };
    expect(state(two)).toBe("CONFLICTING_EVIDENCE");
  });

  it("C13: stops a claim that states no figure of its own at partially verified", () => {
    const { claimed: _, ...noFigure } = verified;
    expect(state(noFigure)).toBe("PARTIALLY_VERIFIED");
    const ev4 = CASES.map(assessCase)
      .flatMap((c) => c.evidence)
      .find((e) => e.id === "EV-4")!;
    expect(ev4.state).toBe("PARTIALLY_VERIFIED");
  });

  it("C16: keeps an investigation with a recorded contradiction short of verified", async () => {
    const base = await inv("INV-2026-003");
    const contradicted: Investigation = {
      ...base,
      id: "INV-CONTRA-1",
      outstanding: 0,
      contradictions: ["Ledger and registry disagree"],
    };
    await expect(
      demoRepo.investigations.create({ ...contradicted, state: "VERIFIED" }),
    ).rejects.toThrow(/evidence policy/);
    await demoRepo.investigations.create({ ...contradicted, id: "INV-CONTRA-2" });
    expect((await inv("INV-CONTRA-2")).state).toBe("PARTIALLY_VERIFIED");
  });

  it("C26: compares a claim that a figure exceeds a threshold as a threshold", () => {
    const { claimed: _, ...rest } = verified;
    const above = (value: number) =>
      state({ ...rest, exceeds: 0.1, values: [{ sourceId: "DS-001", value }] });
    expect(above(0.0996)).toBe("CONFLICTING_EVIDENCE");
    expect(above(0.14)).toBe("VERIFIED");
  });

  it("C21: rejects a point given as a range and a figure that is not finite", () => {
    const estimate = {
      reliability: "third_party_estimate",
      estimator: "E",
      low: 1200,
      high: 1200,
      unit: "USD M",
      asOf: "2025-12-31",
    };
    expect(FigureSchema.safeParse(estimate).success).toBe(false);
    expect(
      FigureSchema.safeParse({
        reliability: "confirmed",
        value: Infinity,
        unit: "x",
        sourceId: "s",
        asOf: "2025-12-31",
      }).success,
    ).toBe(false);
  });

  it("C22: catches every form a hand-written state can take, and not a peer's source type", () => {
    for (const forged of [
      'export const forged = (): EvidenceState => "VERIFIED";',
      "state: 'VERIFIED'",
      'states: ["VERIFIED"]',
      "return `VERIFIED`;",
      'state:\n  "PARTIALLY_VERIFIED"',
    ])
      expect(handWrittenStates(forged), forged).not.toEqual([]);
    expect(handWrittenStates('p.source !== "NOT_AVAILABLE"')).toEqual([]);
    expect(handWrittenStates('source: "NOT_AVAILABLE",')).toEqual([]);
  });
});
