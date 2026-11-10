# L7 AI

Phase 7 of `BankIntelli_Elite_Premium_Design_Roadmap.md`, "Controlled AI orchestration". Needs L5. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `BankIntelli_Elite_Premium_Design_Roadmap.md#no unsupported verified claims in the golden`

Deciding rule, fixed before T2 starts and not edited after: T0 to T6 are ticked, the T5 holdout shows zero unsupported verified claims over n ≥ 3 runs judged by a model other than the maker's, `npm run gate` exits 0, and the human's signoff line (T7) is in the Journal.

## Current state (read 2026-10-28; T0 re-verified 2026-11-10 after L4 and L5)

- No model is connected; the copilot is regex routing over the repository's data: `src/lib/copilot.ts#no live LLM is connected`. Its panel says some answer text is fixed (`src/components/AppShell.tsx#figures are computed from the demo data, other answer text is fixed.`).
- Since L4 the policy sets each answer's state from the answer's own assessments (`src/lib/copilot.ts#const decided = (a: Omit<CopilotAnswer, "state">): CopilotAnswer => ({`), and since L5 T7 a figure whose only source is a simulated system carries a synthetic source, so it cannot reach VERIFIED (`src/lib/copilot.ts#"Data-quality rules (simulated)", "synthetic"`). T3's rule, that model text cannot set a state or a number, holds today for the routing; T3 must keep it holding once a model writes text.
- Since L5 T1 a question's scope is resolved before anything is computed, and an ambiguous scope asks instead of guessing (`src/lib/scope.ts#export function resolveScope(q: string, cat: Catalog, chosen: Chosen = {}): Resolution {`); a scope a model proposes in T3 can be checked by the same resolver.

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint and refresh citations L4 and L5 changed. Evidence: graph-lint exits 0.
- [ ] T1 (human) Provider. needs: T0. Model provider, data residency, what may leave the bank (default: no customer-sensitive content), spend cap, and server-side key storage. Evidence: the decision lines in the Journal.
- [ ] T2 Adapter and tools. needs: T1. A server-side provider adapter with a stub for tests; tools exposed to the model are filtered by the user's permissions and the task's scope. Evidence: tests: a tool outside scope is refused; a build-output test finds no key or provider secret in the client bundle.
- [ ] T3 Role limits. needs: T2. The model proposes intent and scope and drafts narrative; arithmetic comes from calc and states from the L4 policy; model text cannot set a state or a number. Evidence: tests with a stub that returns "VERIFIED" and invented figures: neither reaches the report.
- [ ] T4 Untrusted sources. needs: T2. Source documents are data: instructions inside them change no tool call and no state. Evidence: tests with injected instructions in a source.
- [ ] T5 Golden evaluation. needs: T3, T4. A versioned question set split into improvement and holdout before any tuning; metrics: citation precision, unsupported claims (must be 0), calculation accuracy, latency and cost, with n and the standard error reported. A script exits non-zero on any unsupported verified claim in the holdout. Evidence: the script's output quoted; the judge model named.
- [ ] T6 Independent check. needs: T5. A different model, in at least 3 independent runs, applies the AI, evidence and tenancy attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T7 (human) Signoff. needs: T6. Evidence: the signoff line in the Journal.

## Journal
- 2026-11-10 · L7/T0 · started T0 · tick 1 of 15 · tree clean at f587f7c; gate green last tick
- 2026-11-10 · L7/T0 · passed · gate green on the one load retry (15:25 to 15:35, 4.56 GB free, Chrome closed): `GATE EXIT 0`, `graph-lint: clean` (662 citations), lint `0 errors, 12 warnings`, `Test Files  83 passed (83)`, `Tests  493 passed (493)`, `bundle-scan: clean` twice, `128 passed (6.5m)`, `gate-guard: clean`; overview median `dropped 5`, credit `dropped 3`. The first run (15:15 to 15:25) failed only on the frame budget, `/credit: 7 dropped frames, median of 3`, while the maker searched another repository on the same disk; nothing was loosened · commit see `git log --grep "loop(L7/T0)"` · The one Current-state claim still holds and its citation resolves; added what L4 and L5 changed for this loop: the policy sets every answer's state, a simulated source is synthetic and cannot reach VERIFIED, and a question's scope is resolved, or asked, before anything is computed · Direction: goal unchanged; T3's rule that model text sets no state or number already holds for the routing the model will join · Next: L7 T1 (human) Provider, whose decisions the human gave in conversation this afternoon.
