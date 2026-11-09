import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { caseAssessment } from "@/data/crime";
import { DSC_PSI, findingAssessment } from "@/data/investigations";
import { DRIFT_FEATURES } from "@/data/models";
import { psi } from "@/lib/calc";
import { SUGGESTIONS, answer } from "@/lib/copilot";
import { assignEvidenceState, summarizeStates } from "@/lib/evidence-policy";
import { demoRepo } from "@/repo/demo";

const root = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(join(root, dir)).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
  });

// The schema names the states and the policy assigns them; nothing else may write one.
const ALLOWED = new Set(["src/lib/evidence.ts", "src/lib/evidence-policy.ts"]);
const STATES =
  "VERIFIED|PARTIALLY_VERIFIED|UNVERIFIED|CONFLICTING_EVIDENCE|NOT_AVAILABLE|DRAFT|HYPOTHESIS";
// A state written to a `state`, or typed as one; `source: "NOT_AVAILABLE"` on peer data is not one.
const LITERAL = new RegExp(
  `\\bstate\\s*[:=][^,;]*"(${STATES})"|"(${STATES})"\\s+as\\s+EvidenceState|EvidenceState\\s*=\\s*"(${STATES})"`,
);

describe("evidence states come from the policy (L4 T3)", () => {
  it("writes no evidence state as a literal outside the schema and the policy", () => {
    const hits = walk("src")
      .filter((p) => /\.tsx?$/.test(p) && !p.startsWith("src/test/") && !ALLOWED.has(p))
      .flatMap((p) =>
        readFileSync(join(root, p), "utf8")
          .split("\n")
          .flatMap((line, i) => (LITERAL.test(line) ? [`${p}:${i + 1}: ${line.trim()}`] : [])),
      );
    expect(hits).toEqual([]);
  });

  it("gives each copilot answer the state the policy gives its assessments", async () => {
    const data = {
      finance: await demoRepo.finance.read(),
      models: await demoRepo.models.read(),
      datasets: await demoRepo.datasets.read(),
      crime: await demoRepo.crime.read(),
    };
    for (const q of SUGGESTIONS) {
      const a = answer(q, data);
      expect(a.assessments.length, q).toBeGreaterThan(0);
      const states = a.assessments.map((x) => assignEvidenceState(x).state);
      expect(a.state, q).toBe(summarizeStates(states, a.missing.length));
    }
    const unknown = answer("What is the weather?", data);
    expect([unknown.assessments, unknown.state]).toEqual([[], "NOT_AVAILABLE"]);
  });

  it("shows on every finding, investigation and report the state the policy gives", async () => {
    const { investigations, reports } = await demoRepo.investigations.read();
    for (const inv of investigations) {
      for (const f of inv.findings)
        expect(f.state, f.id).toBe(assignEvidenceState(findingAssessment(f)).state);
      expect(inv.state, inv.id).toBe(
        summarizeStates(
          inv.findings.map((f) => f.state),
          inv.outstanding,
        ),
      );
    }
    for (const r of reports)
      expect(r.state, r.id).toBe(investigations.find((i) => i.id === r.investigation)!.state);
  });

  it("shows on every case's evidence the state the policy gives", async () => {
    const { cases } = await demoRepo.crime.read();
    for (const c of cases)
      for (const e of c.evidence)
        expect(e.state, e.id).toBe(assignEvidenceState(caseAssessment(e)).state);
  });

  it("takes the drift finding's PSI from the drift data", () => {
    const dsc = DRIFT_FEATURES.find((f) => f.feature === "debt_service_coverage")!;
    expect(DSC_PSI).toBeCloseTo(psi(dsc.ref, dsc.cur), 3);
  });

  it("lets the facts decide: illustrative peers, a contradicted drift claim, stale KYC", async () => {
    const { investigations } = await demoRepo.investigations.read();
    const finding = (id: string) =>
      investigations.flatMap((i) => i.findings).find((f) => f.id === id)!;
    expect(finding("F-014-2").state).toBe("PARTIALLY_VERIFIED");
    expect(finding("F-014-4").state).toBe("HYPOTHESIS");
    expect(finding("F-002-1").state).toBe("CONFLICTING_EVIDENCE");
    const { cases } = await demoRepo.crime.read();
    const ev = (id: string) => cases.flatMap((c) => c.evidence).find((e) => e.id === id)!;
    expect([ev("EV-1").state, ev("EV-2").state, ev("EV-3").state, ev("EV-5").state]).toEqual([
      "VERIFIED",
      "PARTIALLY_VERIFIED",
      "NOT_AVAILABLE",
      "UNVERIFIED",
    ]);
  });
});

describe("summarizeStates (L4 T3)", () => {
  it("says not available with nothing assessed, and unverified with only hypotheses", () => {
    expect(summarizeStates([], 0)).toBe("NOT_AVAILABLE");
    expect(summarizeStates(["HYPOTHESIS"], 0)).toBe("UNVERIFIED");
  });
  it("lets one conflict mark the whole conflicting", () => {
    expect(summarizeStates(["VERIFIED", "CONFLICTING_EVIDENCE"], 0)).toBe("CONFLICTING_EVIDENCE");
  });
  it("verifies only when every measured claim is verified, nothing is open and no hypothesis stands", () => {
    expect(summarizeStates(["VERIFIED", "VERIFIED"], 0)).toBe("VERIFIED");
    expect(summarizeStates(["VERIFIED"], 1)).toBe("PARTIALLY_VERIFIED");
    expect(summarizeStates(["VERIFIED", "HYPOTHESIS"], 0)).toBe("PARTIALLY_VERIFIED");
    expect(summarizeStates(["VERIFIED", "UNVERIFIED"], 0)).toBe("PARTIALLY_VERIFIED");
  });
  it("keeps unverified and not available when nothing measured is supported", () => {
    expect(summarizeStates(["UNVERIFIED", "NOT_AVAILABLE"], 0)).toBe("UNVERIFIED");
    expect(summarizeStates(["NOT_AVAILABLE"], 0)).toBe("NOT_AVAILABLE");
  });
});
