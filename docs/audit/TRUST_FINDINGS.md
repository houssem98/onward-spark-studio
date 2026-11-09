# Trust Findings

Written in L0 T5 (2026-10-28) from the T4 read of src and the T0 baseline; extended by the L0 T6 browser run and corrected by the L0 T7 independent check (three runs on a different model; each item below that came from it was reproduced by the maker before it was written). `src/test/trust-findings.test.ts` fails when a finding has no code citation, an unknown severity, no open/fixed status, or names a fixing task that no ledger has. graph-lint checks every citation. L8 T6 later requires zero open critical or high.

## Severity

- critical: a wrong or unauthorized result can reach a decision as if verified, or real data can leak.
- high: breaks a non-negotiable rule of the roadmap (evidence, attribution, separation of duties, no dead destinations).
- medium: misleading or unsafe, but labeled, limited to synthetic data, or one step from harm.
- low: hygiene.

No finding is critical today only because there is no real data, no backend and no network surface. F2, F3, F6 and F13 become critical the day real data or real users arrive.

## Findings

### F1 · high · Evidence states are assigned by hand
- Evidence: the copilot wrote VERIFIED as a literal and so did the fixtures, for instance on the case evidence `src/data/crime.ts#label: "Cash deposit pattern (14 txns)",`; 11 literal assignments in src (L0 T5 said 12, counting a type annotation). The copilot also marked VERIFIED an answer whose missing-data note says the lineage is illustrative. This is what `BankIntelli_Elite_Premium_Design_Roadmap.md#A model cannot set a claim to Verified simply by generating confident` forbids. Since L4 T3 no state is written by hand: the fixtures and the copilot state facts, and the policy sets every state (`src/lib/evidence-policy.ts#export function assignEvidenceState(a: Assessment): Decision {`), held by `src/test/evidence-states.test.ts#writes no evidence state as a literal outside the schema and the policy`; the lineage answer now reads partially verified, its source being illustrative. Since L4 T4 the repository refuses a VERIFIED its facts do not earn (`src/lib/evidence-policy.ts#export function refuseUnearnedVerified(inv: Investigation, today: string): void {`), and the database refuses any VERIFIED written by hand (`supabase/migrations/20261109010000_verified_only_by_policy.sql#only the evidence policy sets VERIFIED`).
- Fix: L4 T2, L4 T3, L4 T4
- Status: fixed in L4 T3

### F2 · high · Anyone approves any model straight to Production
- Evidence: `src/repo/demo.ts#[model]: decision === "Approved" ? "Production" : "Development",`. Retitled in L0 T7: there is no maker or owner concept at all, so the defect is that no validator role or second person exists, not that the maker self-approves.
- Fix: L3 T6
- Status: open

### F3 · high · Any user can set an investigation to Approved
- Evidence: the status select offered every status, Approved included (`src/routes/investigations.$id.tsx#actions.setInvestigationStatus(id, e.target.value as InvStatus)`). Since L3 T8c it offers every status but Approved (`src/routes/investigations.$id.tsx#disabled={s === "Approved"}`), held by `src/test/approved-status.test.tsx#the investigation status control offers every status but Approved`, and the database refuses a client's Approved on an investigation or a report (`supabase/migrations/20261108130000_approved_only_via_approval.sql#only a recorded approval makes work Approved`), held by `src/test/duties.test.ts#is never written by a client into an investigation or a report`. Approved now comes only from a recorded approval, which needs a second person (L3 T6). The demo adapter would still store Approved from a direct call that no route makes (`src/repo/demo.ts#setStatus: (id, status) =>`).
- Fix: L3 T6, L3 T8c, L5 T5
- Status: fixed in L3 T8c

### F4 · high · New investigations inherit another investigation's findings
- Evidence: the wizard copies INV-2025-014's findings and their evidence states into every new investigation, whatever department is chosen: `src/routes/performance.tsx#findings: base.findings.map((f) => ({ ...f, id: f.id.replace("014", id.slice(-3)) }))`. Corrected in L0 T7: with 4 seeded investigations the first new id is INV-2026-014 (maker probe: `INVESTIGATIONS.length` 4 → `INV-2026-014`), so the rename replaces "014" with "014" and the copied findings keep INV-2025-014's ids; actions matched by finding id then appear on both. The button promised a draft report and drafted none; L1 T6 renamed it (`src/routes/performance.tsx#<Button onClick={finish}>Create investigation</Button>`).
- Fix: L4 T3, L5 T1
- Status: open

### F5 · high · Five links lead to a page that does not exist
- Evidence: `src/routes/index.tsx#to="/reports/$id"`, `src/lib/copilot.ts#to: "/reports/RPT-FY25-PERF"`; now served by an honest placeholder (`src/routes/reports.$id.tsx#Report preview not built yet.`) and guarded by `src/test/link-integrity.test.tsx#resolves every in-app link to a route`. All three L0 T7 runs asked to reopen this because the report itself is still not built; not reopened, because the finding was dead links, the human chose the honest placeholder in L0 T2, and the missing report is recorded as absent in `docs/audit/CAPABILITY_MATRIX.md` and owned by L5 T3.
- Fix: L0 T3
- Status: fixed in L0 T3

### F6 · high · Identity is a constant, so every audit event names the same person
- Evidence: `src/repo/demo.ts#const USER = { name: "Sarah Mitchell", role: "Chief Risk Officer" };`, `src/repo/demo.ts#actor: USER.name`
- Fix: L3 T2
- Status: open

### F7 · medium · Nothing persists past a reload
- Evidence: in-memory state in the demo repository (`src/repo/demo.ts#let state: State = {`), labeled on the audit page (`src/routes/audit.tsx#Session-only; not persisted.`).
- Fix: L3 T4
- Status: open

### F8 · medium · Some state changes write no audit event
- Evidence: switching the model version shown: `src/repo/demo.ts#set((s) => ({ modelVersion: { ...s.modelVersion, [model]: version } }))`
- Fix: L3 T5
- Status: open

### F9 · high · The requester can approve their own data access
- Evidence: `src/routes/data.tsx#actions.decideAccess(r.id, "Approved")`. Raised from medium in L0 T7: separation of duties is high on this document's own scale, as F2 and F3 are.
- Fix: L3 T6
- Status: open

### F10 · high · A case note's role comes from page state, not identity
- Evidence: `src/routes/crime.$id.tsx#actions.addCaseNote(id, note, role)`; the investigator can post a Reviewer note on their own case. Raised from medium in L0 T7: attribution is high on this document's own scale.
- Fix: L3 T2
- Status: open

### F11 · medium · A zero denominator shows 0 instead of unavailable
- Evidence: `pct` returned 0 for a zero denominator, so an empty credit selection showed an NPL ratio of 0.00% (L0 T7; L1 T10 put that page behind an empty state). L2 T1 made `pct`, `growth` and `costToIncome` return null (`src/lib/calc.ts#export const pct = (num: number, den: number) => (den === 0 ? null : (num / den) * 100);`), the callers the type checker flagged format null as `src/lib/calc.ts#export const UNAVAILABLE = "Unavailable";`, and a KPI leaves an unavailable delta uncoloured; checked by `src/test/calc.test.ts#zero denominators are unavailable, never 0 or NaN` and `src/test/unavailable.test.tsx#shows as Unavailable in a KPI, with an uncoloured delta`. Reopened by the L2 T8 council: two callers divide inline and so bypass it, and the maker reproduced both. With no measurable dimension the data-quality tile reads `Mean dimension scoreNaNsimulated` on the overview and on the data page, and the average loan size with zero loans reads `$16820000.0k`. Neither triggers on today's fixtures. L2 T11 routes both means through `src/lib/calc.ts#export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);` and gives the loan size an explicit zero check (`src/routes/credit.tsx#value={loans ? `), checked against emptied fixtures by `src/test/figures-reconcile.test.tsx#shows the average loan size as Unavailable when no slice has a loan`.
- Fix: L2 T11
- Status: fixed in L2 T11

### F12 · low · Classification metrics divide by zero
- Evidence: precision, recall, F1 and accuracy divided by raw denominators, giving NaN on a zero cell. Lowered from medium in L0 T7: no fixture has a zero confusion cell (maker probe: `CONF0 none`). L2 T1 returns null only where a denominator is zero and computes F1 over the counts, so a model with no true positives scores 0 rather than 0/0 (`src/lib/calc.ts#f1: ratio(2 * tp, 2 * tp + fp + fn),`); the model page prints null as Unavailable.
- Fix: L2 T1
- Status: fixed in L2 T1

### F13 · medium · CSV export does not neutralize formulas
- Evidence: the escaper quoted commas, quotes and newlines only (`src/lib/calc.ts#const esc = (v: unknown) => {`), so a cell starting with `=`, `+`, `-` or `@` ran as a formula in a spreadsheet. Since L2 T7 a text cell starting with `=`, `+`, `-`, `@`, tab or carriage return gets a leading apostrophe and a number stays a number (`src/lib/calc.ts#Text that starts like a formula stays text in a spreadsheet`), checked for each character by `src/test/exports.test.tsx#keeps CSV cells a spreadsheet would run as formulas as text`.
- Fix: L2 T7
- Status: fixed in L2 T7

### F14 · medium · Two CSV exports carry no synthetic label
- Evidence: the table export's toast said synthetic and the file did not (the toast now lives at `src/repo/export.ts#export const exportedRecords = (n: number, environment: string) =>`); the inventory CSV had no label (`src/routes/models.index.tsx#"model-inventory.csv",`). Since L2 T7 every downloaded file opens with the environment and synthetic line (`src/lib/calc.ts#Every downloaded file states its environment on its first line.`), checked by `src/test/exports.test.tsx#puts the environment and synthetic line first in CSV and Markdown files`, and no other code builds a download (`src/test/exports.test.tsx#builds every download through downloadFile`).
- Fix: L2 T7
- Status: fixed in L2 T7

### F15 · medium · Exports are neither audited nor permission-checked
- Evidence: `src/lib/calc.ts#export function downloadFile(`
- Fix: L3 T5
- Status: open

### F16 · high · The product claims verification it does not perform
- Evidence: the shell's tagline read "Verified intelligence" and the page description "Verified intelligence for better banking decisions."; raised from medium in L0 T7, because the product asserted specific controls that do not exist, beside hand-set states: the evidence badge's tooltip said the checks passed and were reconciled to controls; the investigation page said no claim is marked Verified without passing source, period, unit and reconciliation checks; the overview said reports are labeled Verified only after a verification workflow and a reviewer's sign-off; the copilot panel and the investigation page said arithmetic is computed deterministically; the case summary was called sanitized with no sanitizer; the wizard promised a draft report; the credit page and the page title claimed AI. L1 T6 retired all of these. The tagline now reads `src/components/AppShell.tsx#Banking intelligence · demo`, every evidence-state explanation says where the state comes from, since L4 T3 in these words: `src/components/kit.tsx#In this demo the policy sets the state from facts written into the synthetic sample data; nothing real has been checked.`, and `src/test/honest-copy.test.ts#retires every claim the product cannot back` fails if any of the eleven phrases returns. Until L4 T3 the states themselves were hand-set (F1).
- Fix: L1 T6
- Status: fixed in L1 T6

### F17 · low · The sidebar's synthetic-data notice disappears when the sidebar collapses
- Evidence: `src/components/AppShell.tsx#{!collapsed && (` then `src/components/AppShell.tsx#Proof of concept. All data is synthetic and belongs to the fictional Northstar Bank.`. Lowered from medium in L0 T6: every page header also carries a tag (`src/components/kit.tsx#export function SyntheticTag({`), seen on every page in `docs/audit/VISUAL_BASELINE.md`. L1 T2 added an environment banner above every page that does not collapse with the sidebar and is not hidden in print (`src/components/AppShell.tsx#aria-label="Environment"`), checked by `src/test/app-shell.test.tsx#shows the synthetic-data banner on every real route and the 404`.
- Fix: L1 T2
- Status: fixed in L1 T2

### F18 · medium · Two high-severity dependency advisories are unreviewed
- Evidence: the T0 install reported them (`docs/loops/L0_TRUTH.md#2 high severity vulnerabilities`); which packages is not verified.
- Fix: L8 T6
- Status: open

### F19 · low · The reporting-period selector does nothing
- Evidence: it had no change handler. L1 T2 replaced it and the one-option organization selector with plain text (`src/components/AppShell.tsx#Northstar Bank (fictional) · FY2025`), checked by `src/test/app-shell.test.tsx#has no form controls that change nothing in the header`.
- Fix: L1 T2
- Status: fixed in L1 T2

### F20 · low · Fonts load from a third party on every page
- Evidence: `src/routes/__root.tsx#https://fonts.googleapis.com`
- Fix: L8 T6
- Status: open

### F21 · low · Error reports go to the Lovable editor hook when it is present
- Evidence: route and error message are forwarded (`src/lib/lovable-error-reporting.ts#window.__lovableEvents?.captureException?.(`); a no-op outside the editor, but error text could carry data once data is real.
- Fix: L8 T6
- Status: open

### F22 · low · Drift index read past the end on mismatched bins
- Evidence: now refused: `src/lib/calc.ts#psi: bin counts differ`
- Fix: L0 T1
- Status: fixed in commit 2c3d9ef

### F23 · high · The model detail and case workspace pages never render
- Evidence: selectors return a new array on every call (`src/routes/models.$id.tsx#s.modelDecisions.filter((d) => d.model === id)`, `src/routes/crime.$id.tsx#s.audit.filter((a) => a.entity === id)`) and the store passed the selector's result to React as the snapshot, so React looped until "Maximum update depth exceeded". Found by running the pages in L0 T6 (`docs/audit/VISUAL_BASELINE.md#Two detail pages never render`); present since commit 331ac73. Model approval, drift disposition, case notes and case status live on these two pages, so none of those controls could be used. Fixed in L0 T10 by making the stable state the snapshot; since L2 T4 the hook reads a query instead (`src/store/app-store.ts#return selector(useSuspenseQuery(storeQuery).data);`), still guarded by `src/test/store-selector.test.tsx#renders a selector that builds a new array without looping`.
- Fix: L0 T10
- Status: fixed in L0 T10

### F24 · medium · Every page scrolls sideways at phone width
- Evidence: 53 to 380 px of horizontal overflow at 390 px on every page (L0 T6 said 356, before the case page rendered); the sidebar keeps its width (`docs/audit/VISUAL_BASELINE.md#Phone width is not supported`). L1 T2 hid the sidebar below the md breakpoint behind a menu drawer (`src/components/AppShell.tsx#aria-label="Open navigation"`), let panels shrink in grids (`src/components/kit.tsx#min-w-0 card-surface`) and put the five bare tables in scroll containers; a Playwright pass then measured `worst overflow at 390px: 0px` across all 13 page loads.
- Fix: L1 T2
- Status: fixed in L1 T2

### F25 · medium · Server and client render different content
- Evidence: hydration mismatches on the credit page and, at 390 px, the investigations page (`docs/audit/VISUAL_BASELINE.md#Hydration mismatches.`); the client re-renders the tree, so what the server sent is not what is shown. Cause confirmed in L2 T6: numbers formatted with `toLocaleString()` and no locale render as `12,450` on the server (en-US) and `12 450` in a French-locale browser; at the previous commit, French-locale Chrome on /credit logged `Hydration failed because the server rendered text didn't match the client`. Those five numbers now use `src/lib/calc.ts#export const fmtNum = (v: number) => v.toLocaleString("en-US");`, and afterwards French-locale Chrome at 390 and 1440 px on /credit, /crime, /crime/CASE-0917, /data and /investigations, and English-locale Chrome at 390 px on /investigations and /credit, logged no hydration error.
- Fix: L2 T6 (L1 T2 was named too but did not fix it; recorded by the L1 T7 council)
- Status: fixed in L2 T6

### F26 · high · A VERIFIED drift claim contradicts the app's own calculation
- Evidence: the fixture claims `src/data/investigations.ts#debt_service_coverage PSI exceeds 0.10 vs approved reference period.` and marks it VERIFIED, but the app's own `psi` over the same bins gives 0.0900, and every feature stays under 0.10 (maker probe: `debt_service_coverage=0.0900 sector_code=0.0471 years_in_business=0.0013 revenue_band=0.0010 utilization_rate=0.0731`), so the drift tab shows every band "Stable" beside a High alert seeded as "PSI threshold exceeded". The finance fixture cited a test file that did not exist (`src/data/finance.ts#see calc.test.ts`); L2 T1 added it, and it checks that every demo bridge reconciles (`src/test/calc.test.ts#reconciles every demo bridge`).
- Fix: L4 T2, L4 T3
- Status: open

### F27 · high · The model data tab hard-codes dataset certification
- Evidence: `src/routes/models.$id.tsx#d.includes("DS-004 Curated") || d.includes("Curated")` decides "Pending" or "Certified" from the dataset's name, ignoring the catalog and the store, so a dataset the catalog marks Pending shows Certified and a revoked one never changes.
- Fix: L2 T4, L4 T3
- Status: open

### F28 · high · The wizard's validation step shows fixed passes
- Evidence: `src/routes/performance.tsx#["Access permissions", true],` and its siblings are literals; the step promised that other departments would show NOT_AVAILABLE, yet any department receives the Credit findings (F4). L1 T6 made the copy honest (the checklist now says `src/routes/performance.tsx#These results are fixed in this demo, not computed from the sources.`, and the department note says the Credit findings are copied); the fixed passes themselves remain until L4 T3.
- Fix: L4 T3, L5 T1
- Status: open

### F29 · high · A VERIFIED case evidence item contradicts its own case
- Evidence: `src/data/crime.ts#label: "Cash deposit pattern (14 txns)",` is VERIFIED, but the case lists 6 transactions, 5 of them sub-threshold deposits (maker probe: `CASETX 6 5`).
- Fix: L4 T2
- Status: open

### F30 · medium · Approval and disposition gates are advisory
- Evidence: a comment is the only gate on model approval (`src/routes/models.$id.tsx#disabled={!comment.trim()}`), so a model with an open High finding and an open drift alert can be approved, the same model approved twice, and Reject demotes a Production model; every drift disposition closes the alert and none requests anything (L1 T6 renamed "Request independent validation" to "Needs independent validation", so the label no longer promises a request; the behavior is unchanged) (`src/routes/models.$id.tsx#disposition: d,`); certification is allowed where the page warns it should be withheld.
- Fix: L3 T6, L5 T5
- Status: open

### F31 · medium · Case and alert states drift apart
- Evidence: closing an alert leaves its case open (`src/routes/crime.index.tsx#actions.updateAlert(a.id, { status: "Closed" });`); the "Open cases" panel lists closed cases too (`src/routes/crime.index.tsx#<Panel title="Open cases">`); case status moves have no rule beyond "not the current status".
- Fix: L3 T6
- Status: open

### F32 · medium · Figures that do not reconcile
- Evidence: the data-quality KPI shows 96.1 for week 02 while its own trend has `src/data/datasets.ts#{ week: "W02", score: 93.9 },`; the only Critical quality issue is inside its own tolerance (`src/data/datasets.ts#± 0.05%` against `src/data/datasets.ts#0.025% of control`); the peer benchmark is described as the mean of `src/data/finance.ts#mean credit revenue of high-comparability peers` while including Cascade, rated Medium (maker probe: `Cascade Federal:Medium`); the copilot's bridge text was a literal beside the claim that arithmetic is computed, until L4 T6b took it from the bridges (`src/lib/copilot.ts#.filter((x) => x.kind === "measured")`); "critical notifications", the overview's model alerts and the inventory's open alerts are three different counts; the investigations register's "Open issues" column shows a typed-in number, not a count (`src/data/investigations.ts#outstanding: 3,`). Since L2 T6 the two data-quality figures carry different names (F41), the overview's and the inventory's open model-alert counts share one definition (`src/lib/definitions.ts#formula: "Count of drift alerts whose status is not Closed",`), and the peer benchmark's definition says one of its three peers has medium comparability; the rest stays with L4 T2.
- Fix: L2 T6, L2 T11, L4 T2
- Status: open
- Added by the L2 T8 council and reproduced by the maker: the overview's quarterly table rounds income, expenses and profit separately , so six of eight quarters did not foot, each by 0.1 USD M (Q1-25 showed 262.6 − 178.3 = 84.3 beside a profit of 84.2); L2 T11 computes profit from the rounded figures (`src/data/finance.ts#row["profit"] = (Math.round(total * 10) - Math.round(exp * 10)) / 10;`), checked by `src/test/figures-reconcile.test.tsx#foots the quarterly table at the decimal it shows`. The credit division's 120 appears as department operating income (`src/data/finance.ts#revenue: number; // FY2025 operating income, USD M`) and as the credit page's interest and fee revenue, equal by construction (`src/data/credit.ts#const TOTAL_REVENUE = 120;`, slices summing to 120.00000000000006); L2 T11 shows a control on the credit page that sums every slice and compares it with the division (`src/routes/credit.tsx#Control: interest and fee revenue across all slices`), and both definitions now say how they relate; checked with the division changed to 125 by `src/test/figures-reconcile.test.tsx#reconciles credit portfolio revenue to the credit division`. The council's claim that the copilot compares the two on mismatched bases is unproven and not carried.

### F33 · medium · Detail pages cannot be reached by keyboard
- Evidence: table rows open details on click only (`src/components/DataTable.tsx#onClick={rowAction ? () => rowAction(r) : undefined}`), and src outside the UI kit had no `tabIndex` or `onKeyDown` at all; lineage nodes were click-only too. L1 T5 made clickable rows and lineage nodes focusable and operable with Enter or Space, checked on every page and tab by `src/test/accessibility.test.tsx#names every button, labels every field and makes every clickable row focusable, on every page and tab`; in Chrome, Enter on a focused model row opens the model, and on an issue row opens its drawer.
- Fix: L1 T5
- Status: fixed in L1 T5

### F34 · medium · Form fields without labels
- Evidence: the case note (`src/routes/crime.$id.tsx#<Textarea`) and the model decision comment, the drift assessment, a data-page textarea and the copilot question have placeholders and no label; the L0 T6 measurement saw only the first tab of each page, so it missed most of them. L1 T5 labeled all nine (`src/routes/crime.$id.tsx#aria-label="Case note"`, the decision rationale, the access purpose, the corrective action and its due date, the wizard question, the copilot question); the same test checks every page and tab, and a Chrome pass found no unlabeled field in the row drawers.
- Fix: L1 T5
- Status: fixed in L1 T5

### F35 · medium · The audit trail claims more than it records
- Evidence: the page said every simulated change was recorded; L1 T11 narrowed it to `src/routes/audit.tsx#Model version switches and exports are not recorded`, which is true, but version changes (F8) and exports (F15) are still not recorded, seeded events look like session events, and an event has no authority, outcome or correlation id (`src/repo/types.ts#export interface AuditEvent {`).
- Fix: L3 T5
- Status: open

### F36 · medium · The model card can describe a version that is not in production
- Evidence: the card printed the picker's version, which may be a candidate, beside the model's lifecycle, as if that version were the one in use. Since L2 T7 it names the version it describes with that version's status, and the model's lifecycle with its active version (`src/routes/models.$id.tsx#- Version described: ${v.version} (${v.status})`); its metrics section was already the described version's. Checked by `src/test/exports.test.tsx#says which version a model card describes and that version's status`.
- Fix: L2 T7
- Status: fixed in L2 T7

### F38 · medium · Missing drift data is shown as an all-clear
- Evidence: every model without drift data shows `src/routes/models.$id.tsx#No feature-level drift beyond thresholds for this model in the current period.`, including a model with an open drift alert; the roadmap requires unavailable to look unavailable.
- Fix: L4 T2
- Status: open

### F39 · low · Charts still animate when the user asks for reduced motion
- Evidence: the reduced-motion rule in `src/styles.css#@media (prefers-reduced-motion: reduce)` stops CSS transitions, but recharts animates its series in JavaScript and the series set no animation option (for example `src/routes/credit.tsx#dataKey="balance"`), so bars and lines still animate; found in L1 T5 and left open by L1 T9, which framed the charts without touching their series. Since L10 T3 the chart frame hands every series inside it its motion settings, off under reduced motion (`src/components/charts.tsx#      ? { isAnimationActive: false }`), and `src/test/chart-motion.test.tsx` checks every series on every route and tab.
- Fix: L10 T3 (taken from L8 T5)
- Status: fixed in L10 T3

### F37 · low · Small truth gaps
- Evidence: a frozen date drives "overdue" while audit times use the real clock; since L2 T6 that date is one named constant the definitions state (`src/lib/definitions.ts#export const DEMO_DATE = "2026-01-14";`), so the overdue count says what it is measured against. The copilot's margin pattern also matched "minimum"; L2 T6 made it match whole words (`src/lib/copilot.ts#\bmargin\b|\bnim\b`). The table CSV wrote amounts without their currency while alerts mix EUR and USD; since L2 T7 the alerts export writes each amount with its currency (`src/test/exports.test.tsx#exports alert amounts with their currency`).
- Fix: L2 T6, L2 T7
- Status: fixed in L2 T7

### F40 · medium · The crime trend is not derived from the queue it cites
- Evidence: the trend chart named the alert queue as its source; since L1 T11 it says `src/routes/crime.index.tsx#not derived from the alert queue below`, which is true but leaves the gap: the queue is `src/data/crime.ts#export const ALERTS: CrimeAlert[] = Array.from({ length: 36 }` alerts dated 1 to 14 Jan 2026, while the plotted series starts at `src/data/crime.ts#{ week: "W49", fraud: 412, aml: 96 },`; found by the L1 T7 council.
- Fix: L2 T4
- Status: open

### F41 · low · Two data-quality scores for the same week disagree
- Evidence: the KPI averaged the dimension scores to 96.1 for Week 02 under the name "Avg quality score", while the trend chart on the same page ends at `src/data/datasets.ts#{ week: "W02", score: 93.9 },`; two definitions shared one name. Found by the L1 T7 council. L2 T6 gave the KPI its own definition and name (`src/lib/definitions.ts#label: "Mean dimension score",`), which says it is not the dataset average the trend plots; the overview's data-quality tile uses the same definition, and `src/test/definitions.test.tsx#names each metric once` fails when two definitions share a label.
- Fix: L2 T6
- Status: fixed in L2 T6

### F42 · low · A KPI shows its period and source only on hover
- Evidence: the KPI's tooltip held its period and named no source. Since L2 T6 the tooltip shows unit, period and source from the definitions registry (`src/components/kit.tsx#Period: {d.period} · Source: {d.source}`), but still only on hover; charts show theirs in a caption since L1 T9. Found by the L1 T7 council.
- Fix: L4 T5
- Status: open

### F43 · low · Labels that call the data synthetic or demo are static text
- Evidence: the environment switch reaches the banner, the KPI tooltip and the first line of each download, but other labels are fixed strings: the page tag (`src/components/kit.tsx#export function SyntheticTag({`), the export toast until L4 T6b made it follow the environment (`src/repo/export.ts#environment === "demo" ? "synthetic " : ""`), the Markdown export bodies (`src/routes/crime.$id.tsx#Fictional synthetic data. Customer identifiers are fictional.`), the document title (`src/routes/__root.tsx#Banking Intelligence (demo)`) and the "(demo data)" source caption on every chart. With a production adapter that returned data, these would still call it synthetic. Latent today, because every production read rejects. Found by the L2 T8 council (C11); the source captions belong with the source registry.
- Fix: L4 T5
- Status: open

### F44 · high · The credit report downloads zeros when the selection matches no slice
- Evidence: with Segment Corporate and Channel Digital the page shows its empty state (`src/routes/credit.tsx#const empty = rows.length ? "success" : "empty";`), but the Generate report button sits outside that state and stays enabled, and the file it writes holds `0.0` for balance, originations, revenue, ECL and net write-offs under `src/routes/credit.tsx#"Credit performance report generated"`. The maker reproduced it in L2 T8: button not disabled, five measure rows at `0.0`, empty-state text on the page. Found by the L2 T8 council (C1). L2 T10 disables the button when no slice matches (`src/routes/credit.tsx#onClick={report} disabled={!rows.length}`), checked by `src/test/exports.test.tsx#does not offer the credit report when the selection matches no slice`, which also requires the button enabled on the full selection.
- Fix: L2 T10
- Status: fixed in L2 T10

### F45 · medium · The data-source switch fails open, and a production build still carries the fixtures
- Evidence: any value other than exactly `production` selected the demo adapter; the maker stubbed `Production`, `prod`, `production ` with a trailing space and an empty value, and all four gave the demo environment. Both adapters loaded statically, so a build with `VITE_DATA_SOURCE=production` still held fixture text: in L2 T8 `Harborline` in 6 output files, `Retail PD Scorecard` in 2, `CASE-0917` in 4. The ledger claims a production build serves nothing (`docs/loops/L2_DATA.md#so a production build serves nothing rather than demo data`); that held for reads, not for the bundle. Found by the L2 T8 council (C4); the reviewers could not say what a production bundle held, and the maker built one. L2 T10 made the switch fail closed (`src/repo/queries.ts#!import.meta.env.VITE_DATA_SOURCE || import.meta.env.VITE_DATA_SOURCE === "demo"`) and imports the demo adapter on that branch alone (`src/repo/queries.ts#? (await import("./demo")).demoRepo`), checked over eight values by `src/test/environment.test.tsx#fails closed: only an unset, empty or demo source serves the demo adapter`. The gate now builds for production and fails if any fixture module's marker is in the output (`scripts/bundle-scan.mjs#reached the production build`), and fails if the demo build lacks one, so the scan cannot pass blind. Names typed into UI code are outside its markers; see F47.
- Fix: L2 T10
- Status: fixed in L2 T10

### F46 · medium · Figures labeled as something other than what they count
- Evidence: the overview tile showed open alerts over the model count while the registry defines a count of alerts, in alerts (`src/lib/definitions.ts#formula: "Count of drift alerts whose status is not Closed",`), and its caption counted an open High alert as critical although the register has a separate Critical level. Six model metrics carried a placeholder unit, "as recorded": alert rate, escalation rate, MAPE, bias, MAE and RMSE. The copilot printed a missed target as "$412M vs $430M (-18M)" while its other answers use the shared formatter; the waterfall tooltip printed "$-1.5M" for a step the reconciliation panel prints with a proper minus; the watchlist balance column had no unit. The maker reproduced the tile, the six units, the copilot strings and the headers in L2 T8, and read the tooltip code. Found by the L2 T8 council (C2, C3, C9, C10, C13). L2 T12 fixed each: the tile shows the count alone with a caption from the same register and rule, on the model inventory since L9 T6 moved it off the overview (`src/routes/models.index.tsx#rated High, not closed`); the six units are `%` for the rates, MAPE and bias, whose definition now says it is a percentage, and the LGD fraction for MAE and RMSE; the copilot and the tooltip use the shared formatter (`src/lib/calc.ts#export const stepTooltip = `); the balance header and the write-off caption carry USD M. Checked by `src/test/figures-labels.test.tsx#gives every registry metric a real unit` and the four tests beside it.
- Fix: L2 T12
- Status: fixed in L2 T12

### F47 · low · Fixture names and ids are typed into page and copilot code
- Evidence: besides the demo adapter, UI code names fixture records directly: the peer table's columns, a caveat line, the credit page's link to one investigation, the command palette's example ids, and the copilot's scripted answers (`src/lib/copilot.ts#"Cascade credit revenue includes leasing (low comparability)"`, `src/lib/copilot.ts#{ label: "Linked report", value: "RPT-FY25-PERF" }`; until L5 T1 also its peer list, which now comes from the resolved cohort: `src/lib/copilot.ts#peers: ${scope.cohort.map(peerName).join(", ")}`). A production build therefore still names fictional peers and records, though since L2 T10 no fixture module reaches it; the bundle scan's markers are text only fixture modules hold, so it does not see these. Latent while every production read rejects, except the palette hint, which needs no data. Found by the maker in L2 T10 while choosing those markers. L2 T11 derived the pages' share from the repository (`src/routes/performance.tsx#...historyPeers.map((p) => ({ key: p.id, header: shortName(p) })),`, `src/store/app-store.ts#export const revenueGapInvestigation = (s: State) =>`) or removed it, and `src/test/fixture-literals.test.ts#no page or component types a fixture name or id` now fails on any fixture id, peer name or model name typed in src/routes or src/components. Still open: the copilot (L4 T3), the model page, which the test lists as not yet migrated (`src/test/fixture-literals.test.ts#const NOT_YET_MIGRATED = ["src/routes/models.$id.tsx"];`), and the dataset ids written into the definitions' sources (`src/lib/definitions.ts#export const FINANCE_DATASET = "DS-009";`), which belong with the source registry (L4).
- Fix: L2 T11, L4 T3
- Status: open
