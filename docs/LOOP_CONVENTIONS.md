# Loop Conventions

Read every tick together with the active ledger. The global rules in `~/.claude/LOOP_SPEC.md` and `~/.claude/LOOP_STANDARD.md` win on conflict. `AGENTS.md` wins over both on git history.

## Invariants

- I1 No fake completion. Tick a task only when its Evidence command exited 0 this tick and the output is quoted in the Journal. Code that looks right is not evidence.
- I2 The maker does not grade itself. Independent-check tasks run as a council of models other than the maker (Agent tool `model` override), as the Council protocol below sets out, and a finding counts only as a reproducible failing test or a corrected row.
- I3 No test, no claim. Any status, evidence state, score or success message the product shows is computed by code a test covers, or it is labeled synthetic/demo on screen and in exports, or it is removed. `BankIntelli_Elite_Premium_Design_Roadmap.md#A model cannot set a claim to Verified simply by generating confident`.
- I4 A gate may grow and never shrinks in the change that claims it green. `node scripts/gate-guard.mjs` runs inside the gate. Removing or weakening an assertion is an escalation that names the assertion and why it no longer grades anything real.
- I5 Cite what you claim. Every statement about current code in a doc or ledger cites `path#literal` copied from a file read this tick, or a whole `path`. Never write a citation you did not just read. graph-lint must pass. Mark files a task will create with ` (new)`.
- I6 Types that routes read stay compatible unless the same task updates every consumer.
- I7 No new dependency, service or infrastructure without a failing test that needs it and the human's approval. Packages already in `package.json` are not new.
- I8 Synthetic never masquerades as real. Every fixture-backed value stays labeled until L2 isolates it; after L2 every demo record carries `synthetic: true` and no production path returns fixture data.
- I9 Secrets never enter the repo, logs, reports, or the client bundle.
- I10 Journal status words are passed, failed, blocked, skipped, not tested, and nothing else. Capability status words are the roadmap's: implemented, partial, mocked, broken, absent, not verified (`BankIntelli_Elite_Premium_Design_Roadmap.md#Classify every feature as implemented, partial, mocked, broken,`).
- I11 Smallest safe change: improve the code in place, no rewrites. Keep React 19, TanStack Start/Router/Query and Tailwind (`BankIntelli_Elite_Premium_Design_Roadmap.md#Preserve the existing React 19, TypeScript,`).
- I12 No dead destinations. Every link, nav item and button leads to a working route or a real action; an honest "not built yet" state is allowed, a fake success toast is not.

## Gate

`npm run gate` runs graph-lint, typecheck, lint, tests, build and gate-guard, in that order. Until the gate is first fully green (L0 T1), a task may be ticked when the gate fails only with failures recorded in the L0 T0 baseline and no more of them. L0 cannot close until the gate is fully green, and after that every tick needs it green.

If the rtk hook mangles `npm` output, run the same command through `rtk proxy` and quote the raw output.

## Commits

After a task is ticked, stage only the files that task changed, commit locally with the message `loop(L<n>/T<n>): <what changed>`, and put the short hash in the Journal entry. Never push, never amend, never rebase: this repo syncs to Lovable on push (`AGENTS.md#Avoid rewriting`). The human pushes.

## Recovery

Each tick starts from disk: the ledger and git. Write `started T<n>` in the Journal before changing code. If a tick finds a `started` line with no result and the working tree has changes, finish or revert only the files that task touched, then continue. Any other uncommitted change the loop did not write is an escalation, except the setup files L0 T0 names.

## Stop, checked every tick

- Target: the active loop's signoff task is ticked and the gate passed this tick. The program's target is L8 ticked.
- Budget: the active loop's budget in `docs/LOOP_GRAPH.md`.
- Stall: 3 consecutive ticks with no verdict change and no new failure mode; the same gate failing twice without new evidence; a test weakened to get a pass; a dependency the repo cannot provide. Stall is neither failure nor done. Stop, write the Journal entry, escalate, and do not schedule another tick.

## Escalate: halt and ask, do not decide

- push, deploy, publish, or any call to an external service
- any file entering the repo that the loop did not write and has not read
- a new dependency, service, database, auth provider or infrastructure component
- credentials: `.env*`, any token or key
- spend above the active loop's cap
- deleting a product feature, a route or a screen
- anything legally or regulatorily consequential: compliance wording (SOC2, ISO 27001, DORA, Basel, GDPR), licensed peer data, real customer data
- anything financial-crime related that touches real customer information
- removing or weakening an assertion
- anything unverifiable this tick

## Cadence

120 seconds between ticks, because the next tick is the agent's own work. Not for polling.

## Drift

The prompt restates the goal every tick and each Journal entry ends with a Direction line. It is drift when ticks keep choosing cosmetic tasks while a trust task waits, when a claim is deleted only to turn the gate green, when visual polish lands on a page whose numbers are not yet computed, or when work starts on a feature no ledger task names.

## Judged steps

Prefer checks with exit codes. Where a model must judge (independent checks, L7 graders), state the judge model, which differs from the maker, and n ≥ 3 trials; the Council protocol below satisfies this for independent checks. One judge call is not a stop condition. Cases the checker invents beyond the attack list are the holdout. Visual quality is judged by the human at each signoff, at 1440 px and 390 px widths.

## Council protocol

Every independent-check task runs as a council, after karpathy/llm-council (first answers, anonymous peer review, a chairman's synthesis), adopted on the human's choice in L1 T9. It runs on Claude models through the Agent tool, so it needs no outside API key.

1. Members. Three models, none of them the maker, ideally three different ones (the maker on Opus: Sonnet, Haiku and Fable), each a fresh read-only agent with the identical prompt: the task's scope, the attack list below, and the instruction to report only disagreements, each with a `path:line` and a verbatim code quote.
2. Peer review. Each member then receives the other two reports, labeled Report A and Report B in a shuffled order, with the model names removed. It ranks them by accuracy and evidence and marks each item confirmed, refuted or unsure, quoting code for every confirmation or refutation.
3. Chairman. One more fresh agent on a model other than the maker reads all three reports and all three reviews and writes one deduplicated list, ordered by severity, with each item's agreement count (how many members raised or confirmed it) and any refutation.
4. Maker. The maker reproduces each item on the chairman's list before acting, as before: a failing test or a corrected row, or a rejection with its reason in the Journal. The chairman's ranking orders the work; it never replaces the reproduction.

The Journal records the member and chairman models, the item counts after each stage, and every rejected item with its reason. A council costs about seven agent runs, which count against the loop's budget.

## Reporting

A failed gate is a real result. If a claim cannot be made true at reasonable cost, delete or label it and say so. If every remaining task is blocked, say the work is finished for now and recommend stopping.

## Writing journal entries

`- YYYY-MM-DD · L<n>/T<n> · <passed|failed|blocked|skipped|not tested> · gate <green | red: what> · commit <hash | none> · <what happened, one line> · Direction: <is the goal still the goal?> · Next: <task>`

## Attack list for independent checks

- links: every `to=` and nav entry resolves to a route; params that match no record show an honest not-found
- numbers: a KPI with no unit, period or source; a zero shown where the value is unavailable; a total that does not reconcile; rounding drift between table and chart
- evidence: a claim marked VERIFIED with no source; a stale source still VERIFIED; entity or period mismatch; the copilot or a model setting a state directly
- synthetic: a fixture value on screen or in an export without the synthetic label; a production path returning fixture data
- exports: CSV cells starting with `=`, `+`, `-`, `@`, tab or CR; an export not audited; an export by a role without permission
- identity: a hard-coded user; a role taken from the client; a session after sign-out
- tenancy: org B reads, updates, searches and exports org A's investigation, report, action or audit event by id
- separation of duties: the maker approves its own model, report or action; approve twice; approve after rejection
- audit: an action with no audit event; an audit event edited or deleted; missing actor, authority, outcome or correlation id
- persistence: reload loses a decision; two concurrent edits; corrupt row at load
- states: loading, empty, error, permission denied, stale, partial, success and disabled each render distinctly
- accessibility: an icon-only button with no name; a control unreachable by keyboard; motion with reduced-motion set; a chart with no table alternative
- AI (L7): a source document that carries instructions; a tool call outside the user's permissions; customer data sent to an external model
