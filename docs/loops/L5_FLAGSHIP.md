# L5 Flagship

Phase 5 of `BankIntelli_Elite_Premium_Design_Roadmap.md`, "Complete flagship investigation". Needs L3 and L4. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `BankIntelli_Elite_Premium_Design_Roadmap.md#an executive can ask a question and reach a reviewed,`

Deciding rule, fixed before T1 starts: T0 to T7 are ticked, `npm run gate` exits 0, and the human's signoff line (T8), naming the question asked in the UI, is in the Journal.

## Current state (read 2026-10-28; T0 re-verifies)

- The performance page has the guided wizard and bridge method switcher; its last step links a report that has no page: `src/routes/performance.tsx#Preview linked report`.
- Reconciliation exists and is exact to 1e-6: `src/lib/calc.ts#reconciles: Math.abs(gap - explained) < 1e-6`.
- The report is planned with 14 sections and a Verified rule: `.lovable/plan/finish-the-bankintelli-poc-2026-10-28.md#Verified label only when all findings are verified and reviewer signs off`.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L3 and L4 changed. Evidence: graph-lint exits 0.
- [ ] T1 Scope resolution. needs: T0. A question resolves to entity, department, period, currency, comparison cohort and definitions; an ambiguous scope asks instead of guessing; the scope is in the URL. Evidence: tests for a resolved, an ambiguous and an unsupported question.
- [ ] T2 Golden case. needs: T1. The synthetic credit-vs-peer case runs end to end in the demo adapter: the bridge reconciles with an explicit residual, findings split measured and hypothesis, the year-on-year contradiction and the missing peer funding cost stay visible. Evidence: a golden test asserting every number and state.
- [ ] T3 Report page. needs: T2. `/reports/$id` renders all sections, prints, and downloads HTML and Markdown that carry the environment and synthetic line; the Verified label shows only when every finding is VERIFIED and a reviewer has signed off. Evidence: tests: one unverified finding withholds the label; no sign-off withholds it.
- [ ] T4 Versions. needs: T3. Reports are immutable versions with an evidence snapshot; editing creates a new version; re-rendering a saved version reproduces identical numbers. Evidence: tests.
- [ ] T5 Review. needs: T4. Assign reviewer, comment, approve, reject and rework, with L3 T6 separation of duties; actions get owner, due date and status. Evidence: tests for each transition and each refusal.
- [ ] T6 Long work. needs: T2. Every long-running step shows progress, can be cancelled and retried, and recovers from errors without losing input. Evidence: tests for cancel, retry and a recoverable error.
- [ ] T7 Independent check. needs: T5, T6. A different model, in at least 3 independent runs, applies the evidence, numbers, separation-of-duties and links attacks to the whole flow. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T8 (human) Signoff. needs: T7. The human asks a question in the UI and reaches a reviewed, source-linked report with its limitations. Evidence: the signoff line naming the question.

## Journal
