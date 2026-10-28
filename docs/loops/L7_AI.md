# L7 AI

Phase 7 of `BankIntelli_Elite_Premium_Design_Roadmap.md`, "Controlled AI orchestration". Needs L5. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `BankIntelli_Elite_Premium_Design_Roadmap.md#no unsupported verified claims in the golden`

Deciding rule, fixed before T2 starts and not edited after: T0 to T6 are ticked, the T5 holdout shows zero unsupported verified claims over n ≥ 3 runs judged by a model other than the maker's, `npm run gate` exits 0, and the human's signoff line (T7) is in the Journal.

## Current state (read 2026-10-28; T0 re-verifies)

- No model is connected; the copilot is regex routing over fixtures: `src/lib/copilot.ts#no live LLM is connected`.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L4 and L5 changed. Evidence: graph-lint exits 0.
- [ ] T1 (human) Provider. needs: T0. Model provider, data residency, what may leave the bank (default: no customer-sensitive content), spend cap, and server-side key storage. Evidence: the decision lines in the Journal.
- [ ] T2 Adapter and tools. needs: T1. A server-side provider adapter with a stub for tests; tools exposed to the model are filtered by the user's permissions and the task's scope. Evidence: tests: a tool outside scope is refused; a build-output test finds no key or provider secret in the client bundle.
- [ ] T3 Role limits. needs: T2. The model proposes intent and scope and drafts narrative; arithmetic comes from calc and states from the L4 policy; model text cannot set a state or a number. Evidence: tests with a stub that returns "VERIFIED" and invented figures: neither reaches the report.
- [ ] T4 Untrusted sources. needs: T2. Source documents are data: instructions inside them change no tool call and no state. Evidence: tests with injected instructions in a source.
- [ ] T5 Golden evaluation. needs: T3, T4. A versioned question set split into improvement and holdout before any tuning; metrics: citation precision, unsupported claims (must be 0), calculation accuracy, latency and cost, with n and the standard error reported. A script exits non-zero on any unsupported verified claim in the holdout. Evidence: the script's output quoted; the judge model named.
- [ ] T6 Independent check. needs: T5. A different model, in at least 3 independent runs, applies the AI, evidence and tenancy attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T7 (human) Signoff. needs: T6. Evidence: the signoff line in the Journal.

## Journal
