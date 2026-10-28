# L8 Enterprise

Phase 8 of `BankIntelli_Elite_Premium_Design_Roadmap.md`, "Enterprise readiness". Needs L6 and L7. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `BankIntelli_Elite_Premium_Design_Roadmap.md#the pilot is safe, supportable and auditable`

Deciding rule, fixed before T1 starts: T0 to T7 are ticked, `npm run gate` exits 0, CI is green on the pushed branch, and the human's pilot signoff line (T8) is in the Journal.

## Current state (read 2026-10-28; T0 re-verifies)

- No CI workflow exists in the repository; the only gate is local `npm run gate` (`package.json#"gate":`).

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L6 and L7 changed. Evidence: graph-lint exits 0.
- [ ] T1 (human) CI. needs: T0. Approve a workflow that runs `npm run gate` on every push; the loop writes the file, the human pushes. Evidence: the human's line with the green CI run.
- [ ] T2 (human) Browser E2E. needs: T0. Approve an E2E runner (a new dependency). Evidence: the decision line.
- [ ] T3 E2E golden path. needs: T2. Sign in, ask the flagship question, review and approve as a second user, export; at 1440 px and 390 px. Evidence: the E2E command exits 0.
- [ ] T4 Observability. needs: T0. Structured server logs with correlation ids from request to audit event; connector health and errors visible to admins. Evidence: tests: one request's correlation id appears in its log lines and its audit event.
- [ ] T5 Budgets. needs: T3. Bundle-size and accessibility budgets that fail the gate when exceeded. Evidence: the budget script quoted failing on a deliberate overage, then passing.
- [ ] T6 Security review. needs: T4. A different model, in at least 3 independent runs, reviews the whole app against the attack list; every critical and high finding is fixed with a test. Evidence: `docs/audit/TRUST_FINDINGS.md` (new) shows zero open critical or high, enforced by its test.
- [ ] T7 Runbooks. needs: T6. Deployment guide, data-source limitations, incident response and the backup drill record in `docs/ops/` (new). Evidence: graph-lint exits 0; the human's incident drill line.
- [ ] T8 (human) Pilot signoff. needs: T1, T5, T7. Evidence: the signoff line in the Journal.

## Journal
