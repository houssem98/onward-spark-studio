import { describe, expect, it } from "vitest";

import { assignEvidenceState, type Assessment } from "@/lib/evidence-policy";
import type { Source } from "@/lib/evidence";

const ledger: Source = {
  id: "SRC-GL",
  name: "DS-009 Finance reporting",
  authority: "internal",
  entity: "Northstar Bank (fictional)",
  period: "FY2025",
  asOf: "2026-01-10",
  freshForDays: 30,
  unit: "USD M",
  licence: "Internal use",
  version: "2026.01",
};
const filing: Source = { ...ledger, id: "SRC-10K", name: "Annual report", authority: "audited" };

const verified: Assessment = {
  claim: {
    id: "CLM-1",
    text: "Operating income was $1,240M in FY2025.",
    kind: "measured",
    metricId: "operating_income",
  },
  claimed: 1240,
  scope: { entity: "Northstar Bank (fictional)", period: "FY2025" },
  sources: [ledger],
  values: [{ sourceId: "SRC-GL", value: 1240 }],
  today: "2026-01-14",
};
const state = (a: Assessment) => assignEvidenceState(a).state;

describe("assignEvidenceState (L4 T2)", () => {
  it("verifies a measured claim whose in-scope, fresh, authoritative source supports it", () => {
    expect(state(verified)).toBe("VERIFIED");
  });

  it("keeps a hypothesis a hypothesis, however good its source", () => {
    expect(state({ ...verified, claim: { ...verified.claim, kind: "hypothesis" } })).toBe(
      "HYPOTHESIS",
    );
  });

  it("leaves a confident claim with no source unverified", () => {
    expect(state({ ...verified, sources: [], values: [] })).toBe("UNVERIFIED");
  });

  it("leaves a claim unverified when its only source is about another entity or period", () => {
    expect(state({ ...verified, sources: [{ ...ledger, entity: "Other Bank" }] })).toBe(
      "UNVERIFIED",
    );
    expect(state({ ...verified, sources: [{ ...ledger, period: "FY2024" }] })).toBe("UNVERIFIED");
  });

  it("says not available when an in-scope source gives no value for the claim", () => {
    expect(state({ ...verified, values: [] })).toBe("NOT_AVAILABLE");
  });

  it("marks evidence conflicting when two in-scope sources disagree", () => {
    const a = {
      ...verified,
      sources: [ledger, filing],
      values: [
        { sourceId: "SRC-GL", value: 1240 },
        { sourceId: "SRC-10K", value: 1180 },
      ],
    };
    expect(state(a)).toBe("CONFLICTING_EVIDENCE");
  });

  it("marks evidence conflicting when the claim's own figure is not what its source says", () => {
    expect(state({ ...verified, claimed: 1300 })).toBe("CONFLICTING_EVIDENCE");
  });

  it("treats values within half a percent as agreeing, and beyond it as not", () => {
    const pair = (v: number) => ({
      ...verified,
      claimed: 1000,
      sources: [ledger, filing],
      values: [
        { sourceId: "SRC-GL", value: 1000 },
        { sourceId: "SRC-10K", value: v },
      ],
    });
    expect(state(pair(1005))).toBe("VERIFIED");
    expect(state(pair(1006))).toBe("CONFLICTING_EVIDENCE");
  });

  it("ignores an out-of-scope source's value rather than letting it conflict", () => {
    const a = {
      ...verified,
      sources: [ledger, { ...filing, period: "FY2024" }],
      values: [
        { sourceId: "SRC-GL", value: 1240 },
        { sourceId: "SRC-10K", value: 1100 },
      ],
    };
    expect(state(a)).toBe("VERIFIED");
  });

  it("marks evidence conflicting when recomputing the calculation gives another number", () => {
    expect(state({ ...verified, calculation: { output: 1240, reproduced: 1190 } })).toBe(
      "CONFLICTING_EVIDENCE",
    );
    expect(state({ ...verified, calculation: { output: 1240, reproduced: 1240 } })).toBe(
      "VERIFIED",
    );
  });

  it("stops at partially verified when the calculation could not be reproduced", () => {
    expect(state({ ...verified, calculation: { output: 1240, reproduced: null } })).toBe(
      "PARTIALLY_VERIFIED",
    );
  });

  it("stops at partially verified when the figures do not reconcile", () => {
    expect(state({ ...verified, reconciles: false })).toBe("PARTIALLY_VERIFIED");
    expect(state({ ...verified, reconciles: true })).toBe("VERIFIED");
  });

  it("stops at partially verified when only third-party or synthetic sources support it", () => {
    for (const authority of ["third_party", "synthetic"] as const)
      expect(state({ ...verified, sources: [{ ...ledger, authority }] })).toBe(
        "PARTIALLY_VERIFIED",
      );
    for (const authority of ["regulatory", "audited", "internal"] as const)
      expect(state({ ...verified, sources: [{ ...ledger, authority }] })).toBe("VERIFIED");
  });

  it("downgrades VERIFIED when the source has gone stale", () => {
    expect(state({ ...verified, today: "2026-02-09" })).toBe("VERIFIED");
    expect(state({ ...verified, today: "2026-02-10" })).toBe("PARTIALLY_VERIFIED");
  });

  it("gives its reasons, and the same answer for the same input without changing it", () => {
    const frozen = structuredClone(verified);
    Object.freeze(frozen);
    const stale = assignEvidenceState({ ...frozen, today: "2026-03-01" });
    expect(stale.reasons.join(" ")).toMatch(/stale/i);
    expect(assignEvidenceState(frozen)).toEqual(assignEvidenceState(frozen));
    expect(frozen).toEqual(verified);
  });
});
