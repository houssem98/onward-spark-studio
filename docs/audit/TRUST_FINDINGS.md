# Trust Findings

Written in L0 T5 (2026-10-28) from the T4 read of src and the T0 baseline. `src/test/trust-findings.test.ts` fails when a finding has no code citation, an unknown severity, no open/fixed status, or names a fixing task that no ledger has. graph-lint checks every citation. L8 T6 later requires zero open critical or high.

## Severity

- critical: a wrong or unauthorized result can reach a decision as if verified, or real data can leak.
- high: breaks a non-negotiable rule of the roadmap (evidence, attribution, separation of duties, no dead destinations).
- medium: misleading or unsafe, but labeled, limited to synthetic data, or one step from harm.
- low: hygiene.

No finding is critical today only because there is no real data, no backend and no network surface. F2, F3, F6 and F13 become critical the day real data or real users arrive.

## Findings

### F1 · high · Evidence states are assigned by hand
- Evidence: the copilot writes VERIFIED as a literal (`src/lib/copilot.ts#state: "VERIFIED",`) and so do the fixtures (`src/data/investigations.ts#state: "VERIFIED"`); 12 literal assignments in src. This is what `BankIntelli_Elite_Premium_Design_Roadmap.md#A model cannot set a claim to Verified simply by generating confident` forbids.
- Fix: L4 T2, L4 T3
- Status: open

### F2 · high · The maker approves its own model straight to Production
- Evidence: `src/store/app-store.ts#[model]: decision === "Approved" ? "Production" : "Development",`
- Fix: L3 T6
- Status: open

### F3 · high · Any user can set an investigation to Approved
- Evidence: the status select offers every status, Approved included (`src/routes/investigations.$id.tsx#actions.setInvestigationStatus(id, e.target.value as InvStatus)`).
- Fix: L3 T6, L5 T5
- Status: open

### F4 · high · New investigations inherit another investigation's findings
- Evidence: the wizard copies INV-2025-014's findings and their evidence states, renaming only the ids: `src/routes/performance.tsx#findings: base.findings.map((f) => ({ ...f, id: f.id.replace("014", id.slice(-3)) }))`
- Fix: L4 T3, L5 T1
- Status: open

### F5 · high · Five links lead to a page that does not exist
- Evidence: `src/routes/index.tsx#to="/reports/$id"`, `src/lib/copilot.ts#to: "/reports/RPT-FY25-PERF"`; now served by an honest placeholder (`src/routes/reports.$id.tsx#Report preview not built yet.`) and guarded by `src/test/link-integrity.test.tsx#resolves every in-app link to a route`
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

### F9 · medium · The requester can approve their own data access
- Evidence: `src/routes/data.tsx#actions.decideAccess(r.id, "Approved")`
- Fix: L3 T6
- Status: open

### F10 · medium · A case note's role comes from page state, not identity
- Evidence: `src/routes/crime.$id.tsx#actions.addCaseNote(id, note, role)`
- Fix: L3 T2
- Status: open

### F11 · medium · A zero denominator shows 0 instead of unavailable
- Evidence: `src/lib/calc.ts#export const pct = (num: number, den: number) => (den === 0 ? 0 : (num / den) * 100);`
- Fix: L2 T1
- Status: open

### F12 · medium · Classification metrics divide by zero
- Evidence: `src/lib/calc.ts#const precision = tp / (tp + fp);`
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

### F16 · medium · The product claims verification it does not perform
- Evidence: `src/components/AppShell.tsx#Verified intelligence`, `src/routes/__root.tsx#Verified intelligence for better banking decisions.`
- Fix: L1 T6
- Status: open

### F17 · low · The sidebar's synthetic-data notice disappears when the sidebar collapses
- Evidence: `src/components/AppShell.tsx#{!collapsed && (` then `src/components/AppShell.tsx#Proof of concept. All data is synthetic and belongs to the fictional Northstar Bank.`. Lowered from medium in L0 T6: every page header also carries a tag (`src/components/kit.tsx#export function SyntheticTag({ label = "Synthetic demo data" }`), seen on every page in `docs/audit/VISUAL_BASELINE.md`.
- Fix: L1 T2
- Status: open

### F18 · medium · Two high-severity dependency advisories are unreviewed
- Evidence: the T0 install reported them (`docs/loops/L0_TRUTH.md#2 high severity vulnerabilities`); which packages is not verified.
- Fix: L8 T6
- Status: open

### F19 · low · The reporting-period selector does nothing
- Evidence: no change handler: `src/components/AppShell.tsx#aria-label="Reporting period"`
- Fix: L1 T2
- Status: open

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
- Evidence: selectors return a new array on every call (`src/routes/models.$id.tsx#s.modelDecisions.filter((d) => d.model === id)`, `src/routes/crime.$id.tsx#s.audit.filter((a) => a.entity === id)`) and the store passes the selector's result to React as the snapshot (`src/store/app-store.ts#() => selector(state),`), so React loops until "Maximum update depth exceeded". Found by running the pages in L0 T6 (`docs/audit/VISUAL_BASELINE.md#Two detail pages never render.`); present since commit 331ac73. Model approval, drift disposition, case notes and case status live on these two pages, so none of those controls can be used.
- Fix: L0 T10
- Status: open

### F24 · medium · Every page scrolls sideways at phone width
- Evidence: 53 to 356 px of horizontal overflow at 390 px on every page that renders; the sidebar keeps its width (`docs/audit/VISUAL_BASELINE.md#Phone width is not supported.`).
- Fix: L1 T2
- Status: open

### F25 · medium · Server and client render different content
- Evidence: hydration mismatches on the credit page and, at 390 px, the investigations page (`docs/audit/VISUAL_BASELINE.md#Hydration mismatches.`); the client re-renders the tree, so what the server sent is not what is shown.
- Fix: L1 T2, L2 T6
- Status: open
