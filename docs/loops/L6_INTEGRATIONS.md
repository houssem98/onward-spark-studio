# L6 Integrations

Phase 6 of `BankIntelli_Elite_Premium_Design_Roadmap.md`, "Domain integrations". Needs L5. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `BankIntelli_Elite_Premium_Design_Roadmap.md#each integration has contract tests, freshness`

Deciding rule, fixed before T2 starts: T0 to T6 are ticked, `npm run gate` exits 0, and the human's signoff line (T7) is in the Journal.

## Current state (read 2026-10-28; T0 re-verifies)

- No connector exists; every figure comes from `src/data/finance.ts` and its siblings.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L5 changed. Evidence: graph-lint exits 0.
- [ ] T1 (human) First source. needs: T0. One approved performance or peer source with its licence and terms, the environment it runs in, and where its credentials live. Public regulatory filings are the cheapest to license. Evidence: the decision lines in the Journal.
- [ ] T2 Connector contract. needs: T1. A server-side connector with contract tests against recorded responses (tests never call the live service), unit and period normalization through the L2 registry, retry with backoff, and explicit failure states. Evidence: tests for success, malformed payload, timeout and retry.
- [ ] T3 Freshness. needs: T2. Each source records its last success; the shell's source-health entry shows it; stale data downgrades evidence through the L4 policy. Evidence: tests.
- [ ] T4 Real end to end. needs: T3. One investigation runs on the real source in the production environment. Evidence: the human's run line with the report id, plus the recorded-response test.
- [ ] T5 (human) Next domain. needs: T4. Pick the next domain: credit portfolio, catalog and lineage, or model monitoring. Financial crime waits until L8 T6 is ticked (`BankIntelli_Elite_Premium_Design_Roadmap.md#Add financial-crime systems only after sensitive-data access`). Evidence: the decision line; its tasks are appended here.
- [ ] T6 Independent check. needs: T4. A different model, in at least 3 independent runs, attacks the connector: malformed and stale payloads, unit and period mismatch, retry of a side-effecting call, credentials in logs. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T7 (human) Signoff. needs: T5, T6. Evidence: the signoff line in the Journal.

## Journal
