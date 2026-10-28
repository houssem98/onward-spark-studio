# L4 Evidence

Phase 4 of `BankIntelli_Elite_Premium_Design_Roadmap.md`, "Evidence and source registry". Needs L1 and L2. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `BankIntelli_Elite_Premium_Design_Roadmap.md#every material report claim is linked to evidence or`

Deciding rule, fixed before T1 starts: T0 to T6 are ticked, `npm run gate` exits 0, and the human's signoff line (T7) is in the Journal.

## Current state (read 2026-10-28; T0 re-verifies)

- Evidence states are a type with no policy behind them: `src/data/investigations.ts#export type EvidenceState = "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "CONFLICTING_EVIDENCE" | "NOT_AVAILABLE";`.
- The copilot assigns states by hand, including VERIFIED: `src/lib/copilot.ts#state: "VERIFIED", missing: ["Targets are synthetic budget figures"]`.
- zod is installed (`package.json#"zod": "^3.25.76"`).

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L1 and L2 changed. Evidence: graph-lint exits 0.
- [ ] T1 Schemas. needs: T0. zod schemas for Source (authority, entity, period, as-of, freshness, unit, licence, version), Claim (text, kind measured or hypothesis, metric id from the L2 registry), Calculation (formula, inputs, output) and EvidenceLink. Add DRAFT and HYPOTHESIS to the state set. Every figure also carries a reliability class saying how far to trust the number itself: confirmed (source and as-of date, e.g. a disclosed transaction, never presented as current after its date), third-party estimate (named estimator, range rather than a point), not disclosed (states what is disclosed instead and why it is a different metric, e.g. revenue is not valuation), unavailable (no number is shown or invented). Evidence: tests: valid fixtures parse; each missing required field is rejected; a not-disclosed or unavailable figure that carries a value is rejected; an estimate without a named estimator is rejected.
- [ ] T2 Policy. needs: T1. A pure `assignEvidenceState` decides each state from source authority, entity and period match, freshness, calculation reproduction and reconciliation; no other code may produce VERIFIED. Evidence: one test per rule, including a confident claim with no source that comes out UNVERIFIED and a stale source that downgrades VERIFIED.
- [ ] T3 Copilot and pages use the policy. needs: T2. Remove every hand-written evidence state in src outside fixtures of the policy tests; states shown on screen are policy output. Evidence: a test fails on a literal `"VERIFIED"` assignment outside the policy module; each copilot answer's state equals the policy's.
- [ ] T4 Transitions. needs: T2. The repository refuses any write that sets a claim to VERIFIED except through the policy. Evidence: a test: a direct write is refused; the policy path succeeds.
- [ ] T5 Evidence UI. needs: T2. Clicking a number opens its definition, formula, inputs and source; clicking a finding opens its evidence; contradictions and gaps stay visible; synthetic values carry a watermark; every table of figures (peer benchmarks first) shows, next to each value, a "How reliable is this figure?" column rendering its reliability class and source in plain words, the format the human supplied on 2026-10-28. Built from the L1 components. Evidence: testing-library tests for each interaction.
- [ ] T6 Independent check. needs: T3, T4, T5. A different model, in at least 3 independent runs, applies the evidence and numbers attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T7 (human) Signoff. needs: T6. Evidence: the signoff line in the Journal.

## Journal

- 2026-10-28 · plan change, not a tick · During L0 T5 the human pasted a valuation table whose third column says how reliable each figure is (confirmed and dated, third-party estimate, not disclosed with what is disclosed instead, no reliable figure). Adopted as the reliability class in T1 and the reliability column in T5. The pasted figures themselves are not used; the loop cannot verify them.
