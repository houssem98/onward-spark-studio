import type { Finding, Investigation } from "@/data/investigations";
import { DEFINITIONS, DEMO_DATE } from "@/lib/definitions";
import {
  DEMO_ENTITY,
  SourceSchema,
  type Claim,
  type EvidenceState,
  type Source,
} from "@/lib/evidence";

// The only code that may decide an evidence state. Pure: everything it needs is in the input,
// the assessment date included, so the same input always gives the same state.
export interface Assessment {
  claim: Claim;
  /** The figure the claim states, when it states one. */
  claimed?: number;
  /** The threshold the claim says the figure is above, when it states a threshold instead. */
  exceeds?: number;
  /** The unit of the claimed figure; a registry metric's own unit when the claim names one. */
  unit?: string;
  /** The entity and period the claim is about; a source about anything else cannot support it. */
  scope: { entity: string; period: string };
  sources: Source[];
  /** What each linked source says the figure is. */
  values?: { sourceId: string; value: number }[];
  /** The calculation's stated output and the value recomputed from its inputs (null: could not). */
  calculation?: { output: number; reproduced: number | null };
  /** Whether the figure's parts add up to its total, when it has parts. */
  reconciles?: boolean;
  /** ISO date the assessment is made on. */
  today: string;
}

/** What a record states about its evidence; the claim, scope and date come from the record. */
export type Facts = Omit<Assessment, "claim" | "scope" | "today">;

export interface Decision {
  state: EvidenceState;
  reasons: string[];
}

// Figures agree when the widest gap between any two is at most half a percent of the largest.
const TOLERANCE = 0.005;
const agree = (xs: number[]) =>
  xs.length < 2 || Math.max(...xs) - Math.min(...xs) <= TOLERANCE * Math.max(...xs.map(Math.abs));

const AUTHORITATIVE: ReadonlySet<Source["authority"]> = new Set([
  "regulatory",
  "audited",
  "internal",
]);
const DAY = 86_400_000;
// A source dated after the assessment is not evidence of anything at that date.
const isFresh = (s: Source, today: string) => {
  const age = (Date.parse(today) - Date.parse(s.asOf)) / DAY;
  return age >= 0 && age <= s.freshForDays;
};

export function assignEvidenceState(a: Assessment): Decision {
  if (a.claim.kind === "hypothesis")
    return { state: "HYPOTHESIS", reasons: ["A hypothesis is tested, not verified."] };
  if (a.sources.length === 0) return { state: "UNVERIFIED", reasons: ["No source is linked."] };
  const valid = a.sources.filter((s) => SourceSchema.safeParse(s).success);
  if (valid.length === 0)
    return { state: "UNVERIFIED", reasons: ["No linked source is a well-formed source record."] };

  const inScope = valid.filter((s) => s.entity === a.scope.entity && s.period === a.scope.period);
  if (inScope.length === 0)
    return {
      state: "UNVERIFIED",
      reasons: [`No linked source covers ${a.scope.entity} for ${a.scope.period}.`],
    };

  const ids = new Set(inScope.map((s) => s.id));
  const values = (a.values ?? []).filter((v) => ids.has(v.sourceId));
  if (values.length === 0)
    return { state: "NOT_AVAILABLE", reasons: ["No in-scope source gives a value."] };

  const statesFigure = a.claimed !== undefined || a.exceeds !== undefined;
  const unit = a.unit ?? (a.claim.metricId && DEFINITIONS[a.claim.metricId].unit);
  const otherUnit = inScope.find((s) => values.some((v) => v.sourceId === s.id) && s.unit !== unit);
  if (statesFigure && unit && otherUnit)
    return {
      state: "CONFLICTING_EVIDENCE",
      reasons: [`${otherUnit.name} gives the figure in ${otherUnit.unit}, the claim in ${unit}.`],
    };

  if (a.exceeds !== undefined && values.some((v) => v.value <= a.exceeds!))
    return {
      state: "CONFLICTING_EVIDENCE",
      reasons: [`A source gives a figure that is not above the claimed ${a.exceeds}.`],
    };
  const figures = [
    ...(a.claimed === undefined ? [] : [a.claimed]),
    ...values.map((v) => v.value),
    ...(a.calculation ? [a.calculation.output] : []),
  ];
  if (!agree(figures))
    return {
      state: "CONFLICTING_EVIDENCE",
      reasons: ["The claim and its sources do not give the same figure."],
    };
  if (
    a.calculation &&
    a.calculation.reproduced !== null &&
    !agree([a.calculation.output, a.calculation.reproduced])
  )
    return {
      state: "CONFLICTING_EVIDENCE",
      reasons: [
        `Recomputing the calculation gives ${a.calculation.reproduced}, not ${a.calculation.output}.`,
      ],
    };

  const limits: string[] = [];
  if (!statesFigure)
    limits.push("The claim states no figure of its own, so nothing it says was compared.");
  else if (!unit) limits.push("The claim states no unit, so only the numbers were compared.");
  if (a.claim.metricId === undefined)
    limits.push("The claim names no metric from the definitions registry.");
  if (a.calculation && a.calculation.reproduced === null)
    limits.push("The calculation could not be reproduced.");
  if (a.reconciles === false) limits.push("The figure's parts do not reconcile to its total.");
  const backing = inScope.filter(
    (s) => AUTHORITATIVE.has(s.authority) && values.some((v) => v.sourceId === s.id),
  );
  if (backing.length === 0) limits.push("Only third-party or synthetic sources support it.");
  if (backing.some((s) => s.certified === false))
    limits.push("A dataset it rests on is not certified.");
  else if (!backing.some((s) => isFresh(s, a.today)))
    limits.push("Its authoritative sources are stale.");

  return limits.length
    ? { state: "PARTIALLY_VERIFIED", reasons: limits }
    : {
        state: "VERIFIED",
        reasons: ["An in-scope, fresh, authoritative source supports it and every check passed."],
      };
}

// A report: its findings with its open items, and a missing reviewer sign-off as one more, so only a
// signed-off report whose findings are all verified and nothing open is VERIFIED.
export const reportState = (findings: EvidenceState[], open: number, signedOff: boolean) =>
  summarizeStates(findings, open + (signedOff ? 0 : 1));
export const isVerified = (s: EvidenceState) => s === "VERIFIED";
export const verifiedLabel = (findings: EvidenceState[], signoff: unknown) =>
  isVerified(reportState(findings, 0, signoff !== undefined));

// One state for a set of claims; anything still open, or any standing hypothesis, keeps it short of VERIFIED.
export function summarizeStates(states: EvidenceState[], open: number): EvidenceState {
  if (states.length === 0) return "NOT_AVAILABLE";
  const measured = states.filter((s) => s !== "HYPOTHESIS" && s !== "DRAFT");
  if (measured.length === 0) return "UNVERIFIED";
  if (measured.includes("CONFLICTING_EVIDENCE")) return "CONFLICTING_EVIDENCE";
  if (measured.every((s) => s === "VERIFIED"))
    return open === 0 && measured.length === states.length ? "VERIFIED" : "PARTIALLY_VERIFIED";
  if (measured.some((s) => s === "VERIFIED" || s === "PARTIALLY_VERIFIED"))
    return "PARTIALLY_VERIFIED";
  return measured.every((s) => s === "NOT_AVAILABLE") ? "NOT_AVAILABLE" : "UNVERIFIED";
}

// The record's own claim, scope and date come last, so nothing in its facts can replace them.
export const findingAssessment = (
  f: Pick<Finding, "id" | "claim" | "kind" | "period" | "facts" | "metricId">,
  today = DEMO_DATE,
): Assessment => ({
  ...(f.facts ?? { sources: [] }),
  claim: {
    id: f.id,
    text: f.claim,
    kind: f.kind === "Hypothesis" ? "hypothesis" : "measured",
    ...(f.metricId ? { metricId: f.metricId } : {}),
  },
  scope: { entity: DEMO_ENTITY, period: f.period },
  today,
});

type Unassessed = Omit<Investigation, "state" | "findings"> & {
  findings: Omit<Finding, "state">[];
};

/** The record with every state the policy's, whatever states it came with; a recorded contradiction counts as open. */
export function withPolicyStates(i: Unassessed, today = DEMO_DATE): Investigation {
  const findings = i.findings.map((f) => ({
    ...f,
    state: assignEvidenceState(findingAssessment(f, today)).state,
  }));
  return {
    ...i,
    findings,
    state: summarizeStates(
      findings.map((f) => f.state),
      i.outstanding + i.contradictions.length,
    ),
  };
}

// A record may say VERIFIED only where the policy, on the record's own facts, says so too.
export function refuseUnearnedVerified(inv: Investigation, today: string): void {
  const earned = withPolicyStates(inv, today);
  const forged = inv.findings
    .filter((f, i) => f.state === "VERIFIED" && earned.findings[i]!.state !== "VERIFIED")
    .map((f) => f.id);
  if (inv.state === "VERIFIED" && earned.state !== "VERIFIED") forged.push(inv.id);
  if (forged.length)
    throw new Error(`Only the evidence policy sets Verified: ${forged.join(", ")}`);
}
