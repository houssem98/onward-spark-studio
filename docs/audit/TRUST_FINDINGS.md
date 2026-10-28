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
- Evidence: the copilot writes VERIFIED as a literal (`src/lib/copilot.ts#state: "VERIFIED",`) and so do the fixtures (`src/data/investigations.ts#state: "VERIFIED"`, `src/data/crime.ts#label: "Cash deposit pattern (14 txns)",`); 11 literal assignments in src (L0 T5 said 12, counting a type annotation). The copilot also marks VERIFIED an answer whose missing-data note says the lineage is illustrative. This is what `BankIntelli_Elite_Premium_Design_Roadmap.md#A model cannot set a claim to Verified simply by generating confident` forbids.
- Fix: L4 T2, L4 T3
- Status: open

### F2 · high · Anyone approves any model straight to Production
- Evidence: `src/store/app-store.ts#[model]: decision === "Approved" ? "Production" : "Development",`. Retitled in L0 T7: there is no maker or owner concept at all, so the defect is that no validator role or second person exists, not that the maker self-approves.
- Fix: L3 T6
- Status: open

### F3 · high · Any user can set an investigation to Approved
- Evidence: the status select offers every status, Approved included (`src/routes/investigations.$id.tsx#actions.setInvestigationStatus(id, e.target.value as InvStatus)`).
- Fix: L3 T6, L5 T5
- Status: open

### F4 · high · New investigations inherit another investigation's findings
- Evidence: the wizard copies INV-2025-014's findings and their evidence states into every new investigation, whatever department is chosen: `src/routes/performance.tsx#findings: base.findings.map((f) => ({ ...f, id: f.id.replace("014", id.slice(-3)) }))`. Corrected in L0 T7: with 4 seeded investigations the first new id is INV-2026-014 (maker probe: `INVESTIGATIONS.length` 4 → `INV-2026-014`), so the rename replaces "014" with "014" and the copied findings keep INV-2025-014's ids; actions matched by finding id then appear on both. The button promises a draft report and drafts none (`src/routes/performance.tsx#Create investigation & draft report`).
- Fix: L4 T3, L5 T1
- Status: open

### F5 · high · Five links lead to a page that does not exist
- Evidence: `src/routes/index.tsx#to="/reports/$id"`, `src/lib/copilot.ts#to: "/reports/RPT-FY25-PERF"`; now served by an honest placeholder (`src/routes/reports.$id.tsx#Report preview not built yet.`) and guarded by `src/test/link-integrity.test.tsx#resolves every in-app link to a route`. All three L0 T7 runs asked to reopen this because the report itself is still not built; not reopened, because the finding was dead links, the human chose the honest placeholder in L0 T2, and the missing report is recorded as absent in `docs/audit/CAPABILITY_MATRIX.md` and owned by L5 T3.
- Fix: L0 T3
- Status: fixed in L0 T3

### F6 · high · Identity is a constant, so every audit event names the same person
- Evidence: `src/store/app-store.ts#user: { name: "J. Avery", role: "Chief Risk Officer" },`, `src/store/app-store.ts#actor: state.user.name`
- Fix: L3 T2
- Status: open

### F7 · medium · Nothing persists past a reload
- Evidence: in-memory store (`src/store/app-store.ts#let state: State = {`), labeled on the audit page (`src/routes/audit.tsx#Session-only; not persisted.`).
- Fix: L3 T4
- Status: open

### F8 · medium · Some state changes write no audit event
- Evidence: switching the model version shown: `src/store/app-store.ts#set((s) => ({ modelVersion: { ...s.modelVersion, [model]: version } }));`
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
- Evidence: `src/lib/calc.ts#export const pct = (num: number, den: number) => (den === 0 ? 0 : (num / den) * 100);`. Reachable today (L0 T7): credit filters that match no slice show an NPL ratio of 0.00% with no empty state (`src/routes/credit.tsx#fmtPct(pct(npl, bal), 2)`).
- Fix: L2 T1
- Status: open

### F12 · low · Classification metrics divide by zero
- Evidence: `src/lib/calc.ts#const precision = tp / (tp + fp);`. Lowered from medium in L0 T7: no fixture has a zero confusion cell (maker probe: `CONF0 none`), so it cannot trigger until real data arrives.
- Fix: L2 T1
- Status: open

### F13 · medium · CSV export does not neutralize formulas
- Evidence: the escaper quotes commas, quotes and newlines only (`src/lib/calc.ts#const esc = (v: unknown) => {`), so a cell starting with `=`, `+`, `-` or `@` runs as a formula in a spreadsheet.
- Fix: L2 T7
- Status: open

### F14 · medium · Two CSV exports carry no synthetic label
- Evidence: the table export's toast says synthetic and the file does not (`src/components/DataTable.tsx#synthetic records`); the inventory CSV has no label (`src/routes/models.index.tsx#"model-inventory.csv",`).
- Fix: L2 T7
- Status: open

### F15 · medium · Exports are neither audited nor permission-checked
- Evidence: `src/lib/calc.ts#export function downloadFile(`
- Fix: L3 T5
- Status: open

### F16 · high · The product claims verification it does not perform
- Evidence: `src/components/AppShell.tsx#Verified intelligence`, `src/routes/__root.tsx#Verified intelligence for better banking decisions.`. Raised from medium in L0 T7, because the product asserts specific controls that do not exist, beside hand-set states: the evidence badge's tooltip says `src/components/kit.tsx#checks passed; reconciled to controls`; the investigation page says no claim is `src/routes/investigations.$id.tsx#marked Verified without passing source, period, unit and reconciliation checks.`; the case summary is called sanitized with no sanitizer (`src/routes/crime.$id.tsx#Sanitized summary exported`).
- Fix: L1 T6
- Status: open

### F17 · low · The sidebar's synthetic-data notice disappears when the sidebar collapses
- Evidence: `src/components/AppShell.tsx#{!collapsed && (` then `src/components/AppShell.tsx#Proof of concept. All data is synthetic and belongs to the fictional Northstar Bank.`. Lowered from medium in L0 T6: every page header also carries a tag (`src/components/kit.tsx#export function SyntheticTag({ label = "Synthetic demo data" }`), seen on every page in `docs/audit/VISUAL_BASELINE.md`. L1 T2 added an environment banner above every page that does not collapse with the sidebar and is not hidden in print (`src/components/AppShell.tsx#aria-label="Environment"`), checked by `src/test/app-shell.test.tsx#shows the synthetic-data banner on every route, also with the sidebar collapsed`.
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
- Evidence: selectors return a new array on every call (`src/routes/models.$id.tsx#s.modelDecisions.filter((d) => d.model === id)`, `src/routes/crime.$id.tsx#s.audit.filter((a) => a.entity === id)`) and the store passed the selector's result to React as the snapshot, so React looped until "Maximum update depth exceeded". Found by running the pages in L0 T6 (`docs/audit/VISUAL_BASELINE.md#Two detail pages never render`); present since commit 331ac73. Model approval, drift disposition, case notes and case status live on these two pages, so none of those controls could be used. Fixed by making the stable state the snapshot (`src/store/app-store.ts#return selector(useSyncExternalStore(subscribe, getState, getState));`), guarded by `src/test/store-selector.test.tsx#renders a selector that builds a new array without looping`.
- Fix: L0 T10
- Status: fixed in L0 T10

### F24 · medium · Every page scrolls sideways at phone width
- Evidence: 53 to 380 px of horizontal overflow at 390 px on every page (L0 T6 said 356, before the case page rendered); the sidebar keeps its width (`docs/audit/VISUAL_BASELINE.md#Phone width is not supported`). L1 T2 hid the sidebar below the md breakpoint behind a menu drawer (`src/components/AppShell.tsx#aria-label="Open navigation"`), let panels shrink in grids (`src/components/kit.tsx#min-w-0 rounded-md border bg-card`) and put the five bare tables in scroll containers; a Playwright pass then measured `worst overflow at 390px: 0px` across all 13 page loads.
- Fix: L1 T2
- Status: fixed in L1 T2

### F25 · medium · Server and client render different content
- Evidence: hydration mismatches on the credit page and, at 390 px, the investigations page (`docs/audit/VISUAL_BASELINE.md#Hydration mismatches.`); the client re-renders the tree, so what the server sent is not what is shown. Candidate cause, not verified: numbers formatted with `toLocaleString()` and no locale, which can differ between server and browser.
- Fix: L1 T2, L2 T6
- Status: open

### F26 · high · A VERIFIED drift claim contradicts the app's own calculation
- Evidence: the fixture claims `src/data/investigations.ts#debt_service_coverage PSI exceeds 0.10 vs approved reference period.` and marks it VERIFIED, but the app's own `psi` over the same bins gives 0.0900, and every feature stays under 0.10 (maker probe: `debt_service_coverage=0.0900 sector_code=0.0471 years_in_business=0.0013 revenue_band=0.0010 utilization_rate=0.0731`), so the drift tab shows every band "Stable" beside a High alert seeded as "PSI threshold exceeded". The finance fixture cites a test file that does not exist: `src/data/finance.ts#see calc.test.ts`.
- Fix: L4 T2, L4 T3
- Status: open

### F27 · high · The model data tab hard-codes dataset certification
- Evidence: `src/routes/models.$id.tsx#d.includes("DS-004 Curated") || d.includes("Curated")` decides "Pending" or "Certified" from the dataset's name, ignoring the catalog and the store, so a dataset the catalog marks Pending shows Certified and a revoked one never changes.
- Fix: L2 T4, L4 T3
- Status: open

### F28 · high · The wizard's validation step shows fixed passes
- Evidence: `src/routes/performance.tsx#["Access permissions", true],` and its siblings are literals; the step promises `src/routes/performance.tsx#POC; other departments will show NOT_AVAILABLE.`, yet any department receives the Credit findings (F4).
- Fix: L4 T3, L5 T1
- Status: open

### F29 · high · A VERIFIED case evidence item contradicts its own case
- Evidence: `src/data/crime.ts#label: "Cash deposit pattern (14 txns)",` is VERIFIED, but the case lists 6 transactions, 5 of them sub-threshold deposits (maker probe: `CASETX 6 5`).
- Fix: L4 T2
- Status: open

### F30 · medium · Approval and disposition gates are advisory
- Evidence: a comment is the only gate on model approval (`src/routes/models.$id.tsx#disabled={!comment.trim()}`), so a model with an open High finding and an open drift alert can be approved, the same model approved twice, and Reject demotes a Production model; every drift disposition, "Request independent validation" included, closes the alert and requests nothing (`src/routes/models.$id.tsx#disposition: d,`); certification is allowed where the page warns it should be withheld.
- Fix: L3 T6, L5 T5
- Status: open

### F31 · medium · Case and alert states drift apart
- Evidence: closing an alert leaves its case open (`src/routes/crime.index.tsx#actions.updateAlert(a.id, { status: "Closed" });`); the "Open cases" panel lists closed cases too (`src/routes/crime.index.tsx#<Panel title="Open cases">`); case status moves have no rule beyond "not the current status".
- Fix: L3 T6
- Status: open

### F32 · medium · Figures that do not reconcile
- Evidence: the data-quality KPI shows 96.1 for week 02 while its own trend has `src/data/datasets.ts#{ week: "W02", score: 93.9 },`; the only Critical quality issue is inside its own tolerance (`src/data/datasets.ts#± 0.05%` against `src/data/datasets.ts#0.025% of control`); the peer benchmark is described as the mean of `src/data/finance.ts#mean credit revenue of high-comparability peers` while including Cascade, rated Medium (maker probe: `Cascade Federal:Medium`); the copilot's bridge text is a literal (`src/lib/copilot.ts#Measured: volume −$18.0M`) beside the claim that arithmetic is computed; "critical notifications", the overview's model alerts and the inventory's open alerts are three different counts; the investigations register's "Open issues" column shows a typed-in number, not a count (`src/data/investigations.ts#outstanding: 3,`).
- Fix: L2 T6, L4 T2
- Status: open

### F33 · medium · Detail pages cannot be reached by keyboard
- Evidence: table rows open details on click only (`src/components/DataTable.tsx#onClick={onRowClick ? () => onRowClick(r) : undefined}`), and src outside the UI kit had no `tabIndex` or `onKeyDown` at all; lineage nodes were click-only too. L1 T5 made clickable rows and lineage nodes focusable and operable with Enter or Space, checked on every page and tab by `src/test/accessibility.test.tsx#names every button, labels every field and makes every clickable row focusable, on every page and tab`; in Chrome, Enter on a focused model row opens the model, and on an issue row opens its drawer.
- Fix: L1 T5
- Status: fixed in L1 T5

### F34 · medium · Form fields without labels
- Evidence: the case note (`src/routes/crime.$id.tsx#<Textarea`) and the model decision comment, the drift assessment, a data-page textarea and the copilot question have placeholders and no label; the L0 T6 measurement saw only the first tab of each page, so it missed most of them. L1 T5 labeled all nine (`src/routes/crime.$id.tsx#aria-label="Case note"`, the decision rationale, the access purpose, the corrective action and its due date, the wizard question, the copilot question); the same test checks every page and tab, and a Chrome pass found no unlabeled field in the row drawers.
- Fix: L1 T5
- Status: fixed in L1 T5

### F35 · medium · The audit trail claims more than it records
- Evidence: the page says `src/routes/audit.tsx#Every simulated change made in this session is recorded here`, but version changes (F8) and exports (F15) are not recorded, seeded events look like session events, and an event has no authority, outcome or correlation id (`src/store/app-store.ts#export interface AuditEvent {`).
- Fix: L3 T5
- Status: open

### F36 · medium · The model card can describe a version that is not in production
- Evidence: the card prints the picker's version (`src/routes/models.$id.tsx#- Version: ${version}`), which may be a candidate, beside the model's lifecycle, while its classification metrics come from the model rather than that version.
- Fix: L2 T7
- Status: open

### F38 · medium · Missing drift data is shown as an all-clear
- Evidence: every model without drift data shows `src/routes/models.$id.tsx#No feature-level drift beyond thresholds for this model in the current period.`, including a model with an open drift alert; the roadmap requires unavailable to look unavailable.
- Fix: L4 T2
- Status: open

### F37 · low · Small truth gaps
- Evidence: a frozen date drives "overdue" (`src/routes/models.index.tsx#const TODAY = "2026-01-14";`) while audit times use the real clock; the copilot's `src/lib/copilot.ts#/margin|nim/` also matches "minimum"; the table CSV writes amounts without their currency while alerts mix EUR and USD.
- Fix: L2 T6, L2 T7
- Status: open
