import { describe, expect, it } from "vitest";

import { DATASETS } from "@/data/datasets";
import { DEMO_ENTITY, sourceOf, type Source } from "@/lib/evidence";
import { assignEvidenceState, type Assessment } from "@/lib/evidence-policy";

// L4 T6d: the policy rules the human decided in T6c (C11, C14, C15, C21).
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
  claim: {
    id: "C",
    text: "Operating income was $1,240M",
    kind: "measured",
    metricId: "operating_income",
  },
  claimed: 1240,
  scope: { entity: DEMO_ENTITY, period: "FY2025" },
  sources: [ledger],
  values: [{ sourceId: "DS-001", value: 1240 }],
  today: "2026-01-14",
};
const decide = (a: Assessment) => assignEvidenceState(a);
const state = (a: Assessment) => decide(a).state;
const dataset = (id: string) => DATASETS.find((d) => d.id === id)!;
// A claim about `period` resting on one catalog dataset that gives the claimed figure.
const onDataset = (id: string, period: string, unit = "USD M"): Assessment => ({
  ...verified,
  scope: { entity: DEMO_ENTITY, period },
  sources: [sourceOf(dataset(id), period, unit)],
  values: [{ sourceId: id, value: 1240 }],
});

describe("policy rules from the human's T6c decisions (L4 T6d)", () => {
  it("C11: a source that gives the figure in another unit never verifies the claim", () => {
    expect(state(verified)).toBe("VERIFIED");
    expect(state({ ...verified, sources: [{ ...ledger, unit: "%" }] })).toBe(
      "CONFLICTING_EVIDENCE",
    );
    expect(state({ ...verified, unit: "%" })).toBe("CONFLICTING_EVIDENCE");
  });

  it("C14: every dataset declares its entity and coverage, and the scope rule can fail on them", () => {
    for (const d of DATASETS) {
      expect(d.entity, d.id).toBeTruthy();
      expect(d.coverage, d.id).toBeTruthy();
    }
    expect(state(onDataset("DS-009", "FY2025"))).toBe("VERIFIED");
    expect(state(onDataset("DS-009", "FY2019"))).toBe("UNVERIFIED");
    // Competitor metrics are about the peers, so they cannot support a claim about Northstar.
    expect(dataset("DS-011").entity).not.toBe(DEMO_ENTITY);
    expect(sourceOf(dataset("DS-011"), "FY2025", "USD M").entity).not.toBe(DEMO_ENTITY);
  });

  it("C15: a claim resting on a dataset that is not certified stops at partially verified", () => {
    expect(dataset("DS-001").certification).toBe("Certified");
    expect(dataset("DS-002").certification).not.toBe("Certified");
    expect(state(onDataset("DS-001", "FY2025"))).toBe("VERIFIED");
    const uncertified = decide(onDataset("DS-002", "FY2025"));
    expect(uncertified.state).toBe("PARTIALLY_VERIFIED");
    expect(uncertified.reasons.join(" ")).toMatch(/not certified/i);
  });

  it("C21: a measured claim that names no registry metric stops at partially verified", () => {
    const { metricId: _, ...unnamed } = verified.claim;
    const d = decide({ ...verified, claim: unnamed, unit: "USD M" });
    expect(d.state).toBe("PARTIALLY_VERIFIED");
    expect(d.reasons.join(" ")).toMatch(/registry/i);
  });
});
