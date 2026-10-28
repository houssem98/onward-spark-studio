# L2 Data

Phase 2 of `BankIntelli_Elite_Premium_Design_Roadmap.md`, "Data boundaries and safe demo mode". Needs L0. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `BankIntelli_Elite_Premium_Design_Roadmap.md#demo data is isolated; the UI can switch to an`

Deciding rule, fixed before T1 starts: T0 to T8 are ticked, `npm run gate` exits 0, and the human's signoff line (T9) is in the Journal.

## Current state (read 2026-10-28; T0 re-verifies)

- Pages import fixtures directly, e.g. `src/routes/performance.tsx#import { BANK, BRIDGES, DEPARTMENTS, PEER_BENCHMARK_NOTE, PEER_HISTORY, PEERS, SCORECARD } from "@/data/finance";`, `src/routes/credit.tsx#from "@/data/credit";`, `src/routes/crime.$id.tsx#import { CASES, INVESTIGATORS_LIST, type AlertStatus } from "@/data/crime";`; so does the copilot (`src/lib/copilot.ts#import { DEPARTMENTS, SCORECARD, BRIDGES, PEERS } from "@/data/finance";`).
- Mutable state is a module-level object behind `useSyncExternalStore` (`src/store/app-store.ts#export function useStore<T>(selector: (s: State) => T): T {`); TanStack Query is installed (`package.json#"@tanstack/react-query"`) and unused for data.
- Calc helpers have no tests: `src/lib/calc.ts`.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L0 changed. Evidence: graph-lint exits 0.
- [ ] T1 Calc truth. needs: T0. Tests for every export of `src/lib/calc.ts`, edge cases first: zero denominators return `null` (unavailable), never 0 or NaN, and every caller renders null as "Unavailable" (I6: same task updates consumers); growth with prior 0; bridge reconciliation at the 4-dp boundary and with negative steps; PSI with zero bins and mismatched lengths (throws); waterfall rows sum to the actual. Evidence: tests quoted failing before, passing after.
- [ ] T2 Repository contract. needs: T0. `src/repo/types.ts` (new) declares typed read and write interfaces per domain (finance, credit, crime, datasets, models, investigations, audit); `src/repo/demo.ts` (new) implements them and is the only module outside src/data that imports `@/data/`. Evidence: a test that fails when any other file imports `@/data/`, quoted failing with its count.
- [ ] T3 Migrate overview, performance, investigations. needs: T2. Those routes and the copilot read through the repository with TanStack Query. Evidence: the T2 test's exemption list shrinks by those files; route tests still pass.
- [ ] T4 Migrate the rest. needs: T3. Credit, crime, data, models, audit and the store read and write through the repository. Evidence: the T2 test passes with an empty exemption list.
- [ ] T5 Environment. needs: T2. The repository reports `environment: "demo" | "production"`; every demo record carries `synthetic: true`; the production adapter throws "not configured" rather than returning anything; the L1 banner reads the environment from here. Evidence: tests: all demo records are synthetic; the production adapter returns no data.
- [ ] T6 Definitions registry. needs: T2. One registry holds each metric's definition, unit, currency, period basis, formula and source; KPI tiles and the copilot take a definition id, not inline unit strings. Evidence: a test fails when a rendered KPI has no registry id.
- [ ] T7 Safe exports. needs: T5. Every export (CSV, HTML, Markdown, print) carries an environment and synthetic line; CSV cells starting with `=`, `+`, `-`, `@`, tab or CR are neutralized. Evidence: tests for each format and each leading character.
- [ ] T8 Independent check. needs: T1, T4, T6, T7. A different model, in at least 3 independent runs, applies the numbers, synthetic and exports attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T9 (human) Signoff. needs: T8. Evidence: the signoff line in the Journal.

## Journal
