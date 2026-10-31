# L2 Data

Phase 2 of `BankIntelli_Elite_Premium_Design_Roadmap.md`, "Data boundaries and safe demo mode". Needs L0. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `BankIntelli_Elite_Premium_Design_Roadmap.md#demo data is isolated; the UI can switch to an`

Deciding rule, fixed before T1 starts: T0 to T8 are ticked, `npm run gate` exits 0, and the human's signoff line (T9) is in the Journal.

## Current state (read 2026-10-28; T0 re-verifies)

- Pages import fixtures directly, e.g. `src/routes/credit.tsx#from "@/data/credit";`, `src/routes/crime.$id.tsx#import { CASES, INVESTIGATORS_LIST, type AlertStatus } from "@/data/crime";`. The overview, performance, investigation and report pages and the copilot did too until T3 moved them onto the repository; see its Journal entry.
- Mutable state is a module-level object behind `useSyncExternalStore` (`src/store/app-store.ts#export function useStore<T>(selector: (s: State) => T): T {`); TanStack Query is installed (`package.json#"@tanstack/react-query"`) and unused for data.
- Calc helpers have no tests: `src/lib/calc.ts`.
- Re-verified in T0 (2026-10-31): the three facts above still hold; no test imports the calc module and no route calls `useQuery`. 15 files outside src/data import `@/data/`: 13 import fixture values and 2 only types (`src/components/kit.tsx#import type { EvidenceState } from "@/data/investigations";`, `src/routes/investigations.$id.tsx#import type { InvStatus } from "@/data/investigations";`). Three of the 15 are named by no migration task: the command palette L1 T3 added (`src/components/CommandPalette.tsx#import { MODELS } from "@/data/models";`), the report page (T3 moved it with the investigation pages) and the kit's type import. T4's empty exemption list still covers them.
- Added in T0 from L0 and the L1 council: the findings this loop owns, in `docs/audit/TRUST_FINDINGS.md`. T1: a zero denominator shows 0 (F11); classification metrics divide by zero (F12); T1 fixed both, see its Journal entry. T4: the model data tab decides certification from a dataset's name (F27, shared with L4 T3); the crime trend is not derived from the alert queue (F40). T6: server and client render different content (F25); figures that do not reconcile (F32, shared with L4 T2); two data-quality scores for Week 02, 96.1 and 93.9 (F41); a frozen date beside the real clock and an over-broad copilot match (F37, shared with T7). T7: CSV cells are not neutralized (F13); two CSV exports carry no synthetic label (F14); the model card can name a version that is not in production (F36); amounts are exported without their currency (F37).

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint and refresh citations L0 changed. Evidence: graph-lint exits 0.
- [x] T1 Calc truth. needs: T0. Tests for every export of `src/lib/calc.ts`, edge cases first: zero denominators return `null` (unavailable), never 0 or NaN, and every caller renders null as "Unavailable" (I6: same task updates consumers); growth with prior 0; bridge reconciliation at the 4-dp boundary and with negative steps; PSI with zero bins and mismatched lengths (throws); waterfall rows sum to the actual. Evidence: tests quoted failing before, passing after.
- [x] T2 Repository contract. needs: T0. `src/repo/types.ts` (new) declares typed read and write interfaces per domain (finance, credit, crime, datasets, models, investigations, audit); `src/repo/demo.ts` (new) implements them and is the only module outside src/data that imports `@/data/`. Evidence: a test that fails when any other file imports `@/data/`, quoted failing with its count.
- [x] T3 Migrate overview, performance, investigations. needs: T2. Those routes and the copilot read through the repository with TanStack Query. Evidence: the T2 test's exemption list shrinks by those files; route tests still pass.
- [ ] T4 Migrate the rest. needs: T3. Credit, crime, data, models, audit and the store read and write through the repository. Evidence: the T2 test passes with an empty exemption list.
- [ ] T5 Environment. needs: T2. The repository reports `environment: "demo" | "production"`; every demo record carries `synthetic: true`; the production adapter throws "not configured" rather than returning anything; the L1 banner reads the environment from here. Evidence: tests: all demo records are synthetic; the production adapter returns no data.
- [ ] T6 Definitions registry. needs: T2. One registry holds each metric's definition, unit, currency, period basis, formula and source; KPI tiles and the copilot take a definition id, not inline unit strings. Evidence: a test fails when a rendered KPI has no registry id.
- [ ] T7 Safe exports. needs: T5. Every export (CSV, HTML, Markdown, print) carries an environment and synthetic line; CSV cells starting with `=`, `+`, `-`, `@`, tab or CR are neutralized. Evidence: tests for each format and each leading character.
- [ ] T8 Independent check. needs: T1, T4, T6, T7. A different model, in at least 3 independent runs, applies the numbers, synthetic and exports attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T9 (human) Signoff. needs: T8. Evidence: the signoff line in the Journal.

## Journal

- 2026-10-31 · L2/T0 · started T0 (driver rule 3: L1's only open task is T8, the human's signoff)
- 2026-10-31 · L2/T0 · passed · gate green (`GATE EXIT 0`, `graph-lint: 16 docs · 336 citations`, `graph-lint: clean`, `Tests  91 passed (91)`, `gate-guard: clean · HEAD..working tree`) · commit see `git log --grep "loop(L2/T0)"` · tick 1 of 15. graph-lint was clean before the edit: every L2 citation still resolves after L0 and L1. Re-read every `@/data/` importer: 15 outside src/data, 13 importing values and 2 only types. The command palette, the report page and the kit's type import belong to no migration task, so Current state now names them for T4's empty exemption list. Folded the 11 findings L2 owns into Current state with their owning tasks (T1: F11, F12; T4: F27, F40; T6: F25, F32, F37, F41; T7: F13, F14, F36, F37). No task text changed. Direction: goal unchanged; L2 starts from the measured import graph and open findings, not a refactor wish. Next: L2 T1 calc truth (T2 also open).
- 2026-10-31 · L2/T1 · started T1
- 2026-10-31 · L2/T1 · passed · gate green (`GATE EXIT 0`, `Test Files  22 passed (22)`, `Tests  115 passed (115)`, `gate-guard: clean · HEAD..working tree`) · commit see `git log --grep "loop(L2/T1)"` · tick 2 of 15.
  - **Failing checks first.** `src/test/calc.test.ts` tests every export of the calc module, edge cases first, and `src/test/unavailable.test.tsx` renders a KPI and a chart frame on a zero denominator: `9 failed | 15 passed (24)`. Among them: `expected +0 to be null` (pct, growth, costToIncome and round of null), `expected { precision: NaN, recall: NaN, …(2) } to deeply equal { precision: null, recall: null, …(2) }`, `expected 1 to be 1.01` (1.005 to 2 dp), negative zero from rounding −0.04, and a bridge whose steps differ from its gap by 0.00004 reported as not reconciling. The 15 that passed already pin PSI (finite on zero bins, throws on mismatched bins), waterfall rows (they sum to the actual and draw each step from the running total), CSV quoting and the download.
  - **Changes.**
    - A zero denominator returns null from pct, growth and costToIncome (`src/lib/calc.ts#export const pct = (num: number, den: number) => (den === 0 ? null : (num / den) * 100);`); `diff` and `round` pass null through.
    - Classification metrics return null only where a denominator is zero. F1 is computed over the counts, so a model with no true positives scores 0, not 0/0.
    - Rounding goes half away from zero after dropping binary noise (1.005 → 1.01, −2.5 → −3) and never returns −0.
    - A bridge reconciles on its difference rounded once at 4 dp (`src/lib/calc.ts#reconciles: difference === 0,`); rounding each total first could invent or hide 0.0001.
    - Formatters print null as "Unavailable", a KPI leaves an unavailable delta uncoloured, and a chart frame's table prints null as Unavailable while keeping "—" for an absent cell.
    - Every caller moved in this task (I6): 29 type errors across the copilot and the credit, overview, performance and model pages, plus template strings the type checker could not see (the funnel bar width and the copilot's growth figures), which would have printed "null%".
    - The fixture's pointer `src/data/finance.ts#see calc.test.ts` now names a test that exists and checks every demo bridge reconciles.
  - **Gate change, not a weakening:** the capability-matrix export check skipped only the calc module, where downloadFile is defined; it now also skips test files, because the new calc test calls downloadFile and a test is not a product export. No file it graded before is dropped.
  - **On screen:** demo values are unchanged, read through the copilot: `YoY growth=5.3%`, `NIM FY2025=3.07%`, `NIM moved -0.02pp: earning assets grew faster (5.1%) than NII (4.4%).`
  - **One retry:** the first full gate lost two test workers to `FATAL ERROR: Zone Allocation failed - process out of memory` with 2.6 GB of commit memory free on the machine; the retry passed unchanged.
  - **Docs:** F11 and F12 fixed; four citations of the old code re-pointed (F11, F12, this ledger, L5's Current state); F26 now says the cited test exists.
  - **Direction:** goal unchanged; a missing value now reads as missing instead of 0, which T6's registry and L4's evidence states build on.
  - **Next:** L2 T2 repository contract.
- 2026-10-31 · L2/T2 · started T2
- 2026-10-31 · L2/T2 · passed · gate green (`GATE EXIT 0`, `Test Files  24 passed (24)`, `Tests  119 passed (119)`, `gate-guard: clean · HEAD..working tree`) · commit see `git log --grep "loop(L2/T2)"` · tick 3 of 15.
  - **Failing check first.** `src/test/data-boundary.test.ts` with an empty migration list: `expected [ …(13) ] to deeply equal []`, the 13 files T0 counted, from `"src/components/CommandPalette.tsx"` to `"src/store/app-store.ts"`.
  - **Changes.**
    - `src/repo/types.ts` declares the contract per domain (finance, credit, crime, datasets, models, investigations, audit): one read that resolves to a snapshot of the domain, and one write for each of the store's 16 actions; finance and credit have no writes today. Its domain types come from the fixture modules as type-only imports.
    - `src/repo/demo.ts` implements it: static data from the fixtures, mutable data from the store, and writes passed to the store's actions until T4 moves that state behind the adapter.
    - The boundary test counts value imports, re-exports and dynamic imports of the fixtures, by alias or by relative path, outside src/data and test files. A type-only import carries no data, so the kit's and the investigation page's type imports do not count. The 13 readers form the migration list for T3 and T4, and a second assertion fails when a listed file stops reading fixtures, so the list can only shrink.
    - `src/test/repo-demo.test.ts`: every domain reads non-empty, and a write shows in the next read and in the audit trail.
  - **Probes:** a relative `../data/` import in the audit page, an inline `import { type … }` in the kit, and the report page's fixture import commented out → `"src/components/kit.tsx"`, `"src/routes/audit.tsx"` and `"src/routes/reports.$id.tsx"` reported; all three restored byte-identical.
  - **Direction:** goal unchanged; the demo data now has one door, and T3 and T4 close the others.
  - **Next:** L2 T3 migrate overview, performance and investigations (T5 and T6 also open).
- 2026-10-31 · L2/T3 · started T3
- 2026-10-31 · L2/T3 · passed · gate green (`GATE EXIT 0`, `Test Files  25 passed (25)`, `Tests  120 passed (120)`, `gate-guard: clean · HEAD..working tree`) · commit see `git log --grep "loop(L2/T3)"` · tick 4 of 15.
  - **Evidence.** The boundary test's migration list shrank from 13 to 8: the overview, performance, investigations and report pages and the copilot no longer read fixtures, and the test's second assertion fails if any of the five stays listed. Every route test passes unchanged.
  - **Changes.**
    - `src/repo/queries.ts` holds the active repository and one query per domain.
    - Each migrated route's loader fills the query cache (`src/routes/performance.tsx#await queryClient.ensureQueryData(financeQuery);`) and its component reads with `useSuspenseQuery`, so the page has its data on the server and on navigation. An unknown report id still answers 404 from the loader.
    - The router hands the server's query cache to the browser through its own dehydrate and hydrate options (`src/router.tsx#dehydrate: () => ({ queries: JSON.stringify(dehydrate(queryClient)) }),`), which Start calls during SSR (`node_modules/@tanstack/router-core/dist/esm/ssr/ssr-server.js#const dehydrate = router.options.dehydrate;`) and before the browser renders (`node_modules/@tanstack/router-core/dist/esm/load-client.js#router.options.hydrate?.(dehydratedRouter.dehydratedData)`). Without it the browser's cache starts empty, because the router builds a new client there. TanStack's dedicated SSR-query package would have been a new dependency.
    - The copilot answers from data passed in; the shell fetches it through the query cache when asked, so a question from a page that loaded none of it still gets an answer. The unused `PEER_IDS` export went with its fixture import.
    - The wizard's template investigation is chosen by id (`INV-2025-014`) from the store, not as the fixture's first element, so a newly created investigation at the top of the list cannot become the template.
    - The mutable registers (investigations, actions) still come from the store; T4 moves them behind the repository with their writes.
    - Two test fixtures that mount the shell in their own route tree gained the QueryClientProvider the real root provides.
  - **New test:** `src/test/copilot.test.tsx` asks from /crime and finds `Credit performance vs peer group` and `5.3%`. Probe: without the answer write, `Unable to find an element with the text: Credit performance vs peer group.`; restored byte-identical.
  - **Browser:** on the dev server, the server HTML for /, /performance, /investigations and /reports/RPT-FY25-PERF answered 200 with the query cache embedded, and /reports/NOPE answered 404. Headless Chrome at 1440 px logged only Vite's connect lines and React's DevTools notice on each page, no hydration error, and the hydrated pages show their content (`Revenue and profit trend`, `Net interest margin`, `Report library`).
  - **Docs:** three matrix rows, this ledger's Current state and the roadmap's data row re-pointed to code that exists; statuses unchanged, since the data is still demo data.
  - **Direction:** goal unchanged; five consumers now reach demo data only through the repository, the seam T5's environment switch needs.
  - **Next:** L2 T4 migrate the rest (T5 and T6 also open).
