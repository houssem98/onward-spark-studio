import { describe, expect, it } from "vitest";

import {
  CalculationSchema,
  ClaimSchema,
  EVIDENCE_STATES,
  EvidenceLinkSchema,
  EvidenceStateSchema,
  FigureSchema,
  SourceSchema,
} from "@/lib/evidence";

const source = {
  id: "SRC-1",
  name: "DS-009 Finance reporting",
  authority: "internal",
  entity: "Northstar Bank (fictional)",
  period: "FY2025",
  asOf: "2026-01-14",
  freshForDays: 30,
  unit: "USD M",
  licence: "Internal use",
  version: "2026.01",
};
const measured = {
  id: "CLM-1",
  text: "Operating income was $1,240M in FY2025.",
  kind: "measured",
  metricId: "operating_income",
};
const hypothesis = {
  id: "CLM-2",
  text: "SME approval delays may have reduced originations.",
  kind: "hypothesis",
};
const calculation = {
  id: "CALC-1",
  formula: "Net interest income + non-interest income",
  inputs: [
    { name: "Net interest income", value: 820, unit: "USD M", sourceId: "SRC-1" },
    { name: "Non-interest income", value: 420, unit: "USD M", sourceId: "SRC-1" },
  ],
  output: { value: 1240, unit: "USD M" },
};
const link = { claimId: "CLM-1", sourceId: "SRC-1", calculationId: "CALC-1" };
const figures = {
  confirmed: {
    reliability: "confirmed",
    value: 1240,
    unit: "USD M",
    sourceId: "SRC-1",
    asOf: "2026-01-14",
  },
  third_party_estimate: {
    reliability: "third_party_estimate",
    estimator: "Synthetic Analyst Co (fictional)",
    low: 1100,
    high: 1300,
    unit: "USD M",
    asOf: "2025-11-30",
  },
  not_disclosed: {
    reliability: "not_disclosed",
    disclosedInstead: "Revenue is disclosed",
    whyDifferent: "Revenue is not valuation",
  },
  unavailable: { reliability: "unavailable", reason: "No source covers this period" },
};

const without = (o: Record<string, unknown>, key: string) => {
  const copy = { ...o };
  delete copy[key];
  return copy;
};

describe("evidence schemas (L4 T1)", () => {
  it("parses valid fixtures", () => {
    expect(SourceSchema.safeParse(source).success).toBe(true);
    expect(ClaimSchema.safeParse(measured).success).toBe(true);
    expect(ClaimSchema.safeParse(hypothesis).success).toBe(true);
    expect(CalculationSchema.safeParse(calculation).success).toBe(true);
    expect(EvidenceLinkSchema.safeParse(link).success).toBe(true);
    expect(EvidenceLinkSchema.safeParse(without(link, "calculationId")).success).toBe(true);
    for (const f of Object.values(figures)) expect(FigureSchema.safeParse(f).success).toBe(true);
  });

  it("has DRAFT and HYPOTHESIS in the state set, beside the five earlier states", () => {
    expect([...EVIDENCE_STATES].sort()).toEqual(
      [
        "CONFLICTING_EVIDENCE",
        "DRAFT",
        "HYPOTHESIS",
        "NOT_AVAILABLE",
        "PARTIALLY_VERIFIED",
        "UNVERIFIED",
        "VERIFIED",
      ].sort(),
    );
    expect(EvidenceStateSchema.safeParse("DRAFT").success).toBe(true);
    expect(EvidenceStateSchema.safeParse("HYPOTHESIS").success).toBe(true);
    expect(EvidenceStateSchema.safeParse("CONFIDENT").success).toBe(false);
  });

  const required: [string, { safeParse: (v: unknown) => { success: boolean } }, object][] = [
    ["a source", SourceSchema, source],
    ["a claim", ClaimSchema, measured],
    ["a calculation", CalculationSchema, calculation],
    ["an evidence link", EvidenceLinkSchema, without(link, "calculationId")],
    ...Object.entries(figures).map(
      ([k, f]) => [`the ${k} figure`, FigureSchema, f] as [string, typeof FigureSchema, object],
    ),
  ];
  for (const [name, schema, valid] of required) {
    it(`rejects ${name} missing any required field`, () => {
      const kept = Object.keys(valid).filter(
        (key) => !schema.safeParse(without(valid as Record<string, unknown>, key)).success,
      );
      expect(kept).toEqual(Object.keys(valid));
    });
  }

  it("rejects a not-disclosed or unavailable figure that carries a value", () => {
    for (const f of [figures.not_disclosed, figures.unavailable]) {
      expect(FigureSchema.safeParse({ ...f, value: 0 }).success).toBe(false);
      expect(FigureSchema.safeParse({ ...f, low: 1, high: 2 }).success).toBe(false);
    }
  });

  it("rejects an estimate without a named estimator, or given as a point", () => {
    const e = figures.third_party_estimate;
    expect(FigureSchema.safeParse(without(e, "estimator")).success).toBe(false);
    expect(FigureSchema.safeParse({ ...e, estimator: " " }).success).toBe(false);
    expect(FigureSchema.safeParse({ ...e, value: 1200 }).success).toBe(false);
    expect(FigureSchema.safeParse({ ...e, low: 1300, high: 1100 }).success).toBe(false);
  });

  it("rejects a measured claim without a metric from the definitions registry", () => {
    expect(ClaimSchema.safeParse(without(measured, "metricId")).success).toBe(false);
    expect(ClaimSchema.safeParse({ ...measured, metricId: "made_up_metric" }).success).toBe(false);
  });
});
