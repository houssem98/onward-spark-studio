import type { Finding, Investigation } from "@/data/investigations";
import { DEMO_DATE } from "@/lib/definitions";
import { DEMO_ENTITY, type Claim, type EvidenceState, type Source } from "@/lib/evidence";

// The only code that may decide an evidence state. Pure: everything it needs is in the input,
// the assessment date included, so the same input always gives the same state.
export interface Assessment {
  claim: Claim;
  /** The figure the claim states, when it states one. */
  claimed?: number;
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

// Two values agree when they differ by at most half a percent of the larger.
const TOLERANCE = 0.005;
const agree = (a: number, b: number) =>
  Math.abs(a - b) <= TOLERANCE * Math.max(Math.abs(a), Math.abs(b));

const AUTHORITATIVE: ReadonlySet<Source["authority"]> = new Set([
  "regulatory",
  "audited",
  "internal",
]);
const DAY = 86_400_000;
const isFresh = (s: Source, today: string) =>
  (Date.parse(today) - Date.parse(s.asOf)) / DAY <= s.freshForDays;

export function assignEvidenceState(a: Assessment): Decision {
  if (a.claim.kind === "hypothesis")
    return { state: "HYPOTHESIS", reasons: ["A hypothesis is tested, not verified."] };
  if (a.sources.length === 0) return { state: "UNVERIFIED", reasons: ["No source is linked."] };

  const inScope = a.sources.filter(
    (s) => s.entity === a.scope.entity && s.period === a.scope.period,
  );
  if (inScope.length === 0)
    return {
      state: "UNVERIFIED",
      reasons: [`No linked source covers ${a.scope.entity} for ${a.scope.period}.`],
    };

  const ids = new Set(inScope.map((s) => s.id));
  const values = (a.values ?? []).filter((v) => ids.has(v.sourceId));
  if (values.length === 0)
    return { state: "NOT_AVAILABLE", reasons: ["No in-scope source gives a value."] };

  const all =
    a.claimed === undefined
      ? values.map((v) => v.value)
      : [a.claimed, ...values.map((v) => v.value)];
  if (all.some((v) => !agree(v, all[0]!)))
    return {
      state: "CONFLICTING_EVIDENCE",
      reasons: ["The claim and its sources do not give the same figure."],
    };
  if (
    a.calculation &&
    a.calculation.reproduced !== null &&
    !agree(a.calculation.output, a.calculation.reproduced)
  )
    return {
      state: "CONFLICTING_EVIDENCE",
      reasons: [
        `Recomputing the calculation gives ${a.calculation.reproduced}, not ${a.calculation.output}.`,
      ],
    };

  const limits: string[] = [];
  if (a.calculation && a.calculation.reproduced === null)
    limits.push("The calculation could not be reproduced.");
  if (a.reconciles === false) limits.push("The figure's parts do not reconcile to its total.");
  const backing = inScope.filter(
    (s) => AUTHORITATIVE.has(s.authority) && values.some((v) => v.sourceId === s.id),
  );
  if (backing.length === 0) limits.push("Only third-party or synthetic sources support it.");
  else if (!backing.some((s) => isFresh(s, a.today)))
    limits.push("Its authoritative sources are stale.");

  return limits.length
    ? { state: "PARTIALLY_VERIFIED", reasons: limits }
    : {
        state: "VERIFIED",
        reasons: ["An in-scope, fresh, authoritative source supports it and every check passed."],
      };
}

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

export const findingAssessment = (
  f: Pick<Finding, "id" | "claim" | "kind" | "period" | "facts">,
  today = DEMO_DATE,
): Assessment => ({
  claim: { id: f.id, text: f.claim, kind: f.kind === "Hypothesis" ? "hypothesis" : "measured" },
  scope: { entity: DEMO_ENTITY, period: f.period },
  today,
  ...(f.facts ?? { sources: [] }),
});

// A record may say VERIFIED only where the policy, on the record's own facts, says so too.
export function refuseUnearnedVerified(inv: Investigation, today: string): void {
  const states = inv.findings.map((f) => assignEvidenceState(findingAssessment(f, today)).state);
  const forged = inv.findings
    .filter((f, i) => f.state === "VERIFIED" && states[i] !== "VERIFIED")
    .map((f) => f.id);
  if (inv.state === "VERIFIED" && summarizeStates(states, inv.outstanding) !== "VERIFIED")
    forged.push(inv.id);
  if (forged.length)
    throw new Error(`Only the evidence policy sets Verified: ${forged.join(", ")}`);
}
