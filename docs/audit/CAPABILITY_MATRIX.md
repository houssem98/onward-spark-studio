# Capability Matrix

Written in L0 T4 (2026-10-28) from reading every file in src/routes, the store, the shell and the export helpers; corrected by the L0 T6 browser run, the L0 T10 fix and the L0 T7 independent check. `src/test/capability-matrix.test.ts` fails when a route file, a store action a route calls, a file that calls `downloadFile`, or a table `exportName` has no row here, when a status is not one of the roadmap's words, or when an implemented row names no existing test. graph-lint checks every citation below.

## Status words

From `BankIntelli_Elite_Premium_Design_Roadmap.md#Classify every feature as implemented, partial, mocked, broken,`. Rules used here:

- implemented: does what it claims, and a named test proves it. Today no row qualifies.
- partial: works inside one browser session (in-memory store, client-written audit event) but is not persisted, permissioned or attributable to a real user (`src/store/app-store.ts#let state: State = {`, `src/store/app-store.ts#user: { name: "J. Avery", role: "Chief Risk Officer" },`).
- mocked: shows synthetic fixture data, or looks live and changes nothing or invents content.
- broken: does not work as presented.
- absent: linked or planned, no code. A placeholder that says the feature is not built counts as absent.
- not verified: code exists and was not judged.

A route row rates the data the page shows; its controls and exports have their own rows.

## Counts

35 rows: 13 routes, 17 controls, 5 exports. implemented 0, partial 17, mocked 16, broken 0, absent 2, not verified 0.

History: L0 T4 wrote 32 rows (partial 17, mocked 13, broken 1, absent 1). L0 T3 put a placeholder on the report route. L0 T6 ran every page and found the two detail pages broken; L0 T10 fixed them. L0 T7's three independent runs then corrected: the report route and its links are absent, because the placeholder says the report is not built; approving data access is mocked, because it grants nothing; marking an action Done is mocked, because it writes invented evidence, and so it left the partial investigation row, which no longer double-rates `createInvestigation`; the organization selector and the notifications bell gained rows; the audit route's evidence no longer says "labeled honestly"; each table export is named.

## Routes

| kind | id | status | evidence | known by |
|---|---|---|---|---|
| route | `src/routes/__root.tsx` | partial | Shell, 404 and error boundary work; the page meta claims verification nothing performs: `src/routes/__root.tsx#Verified intelligence for better banking decisions.` | read |
| route | `src/routes/index.tsx` | mocked | Executive overview built from fixtures: `src/routes/index.tsx#import { DEPARTMENTS, quarterlyRevenue } from "@/data/finance";` | read; run: `docs/audit/VISUAL_BASELINE.md`; routing only: `src/test/app-routing.test.tsx#matches a page for / instead of falling back to not found` |
| route | `src/routes/performance.tsx` | mocked | Scorecard, peers and bridge from fixtures: `src/routes/performance.tsx#} from "@/data/finance";` | read; run |
| route | `src/routes/credit.tsx` | mocked | Portfolio slices from fixtures: `src/routes/credit.tsx#from "@/data/credit";` | read; run |
| route | `src/routes/crime.index.tsx` | mocked | Alert queue seeded from fixtures: `src/routes/crime.index.tsx#import { CRIME_TREND, INVESTIGATORS_LIST, type CrimeAlert } from "@/data/crime";` | read; run |
| route | `src/routes/crime.$id.tsx` | mocked | Case workspace over fixture cases (`src/routes/crime.$id.tsx#import { CASES, INVESTIGATORS_LIST, type AlertStatus } from "@/data/crime";`); broken until L0 T10 by an infinite update loop | run: `docs/audit/VISUAL_BASELINE.md#Two detail pages never render (fixed in L0 T10).` |
| route | `src/routes/data.tsx` | mocked | Catalog, quality and lineage from fixtures; lineage is illustrative: `src/routes/data.tsx#} from "@/data/datasets";`, `src/lib/copilot.ts#Lineage is illustrative, not harvested from live systems` | read; run |
| route | `src/routes/models.index.tsx` | mocked | Inventory from fixtures: `src/routes/models.index.tsx#import { MODELS, type Model } from "@/data/models";` | read; run |
| route | `src/routes/models.$id.tsx` | mocked | Monitoring, drift and validation from fixtures (`src/routes/models.$id.tsx#} from "@/data/models";`); its data tab hard-codes dataset certification (trust finding F27); broken until L0 T10 by the same loop | run: `docs/audit/VISUAL_BASELINE.md#Two detail pages never render (fixed in L0 T10).` |
| route | `src/routes/investigations.index.tsx` | mocked | Registers seeded from fixtures: `src/routes/investigations.index.tsx#import { REPORTS, type Action, type Investigation } from "@/data/investigations";` | read; run |
| route | `src/routes/investigations.$id.tsx` | mocked | Detail over the store's fixture copy: `src/store/app-store.ts#investigations: INVESTIGATIONS.map((i) => ({ ...i })),` | read; run |
| route | `src/routes/audit.tsx` | partial | Seeded events plus this session's, shown alike; the subtitle says every change is recorded, which is false, since version changes and exports are not (`src/routes/audit.tsx#Every simulated change made in this session is recorded here`) | read; run |
| route | `src/routes/reports.$id.tsx` | absent | The report does not exist; the route is a placeholder that says so (`src/routes/reports.$id.tsx#Report preview not built yet.`); the full report is L5 T3 | read; `src/test/link-integrity.test.tsx#resolves every in-app link to a route` |

## Controls

| kind | id | status | evidence | known by |
|---|---|---|---|---|
| control | approve or reject a model, `actions.decideModel` | partial | Session-only, no validator role and no precondition: a comment is the only gate (`src/routes/models.$id.tsx#disabled={!comment.trim()}`), so a model with an open High finding and an open drift alert can be approved, approved twice, and Reject sends a Production model to Development (`src/store/app-store.ts#[model]: decision === "Approved" ? "Production" : "Development",`); the toast is labeled: `src/routes/models.$id.tsx#toast.success("Demo approval recorded")` | read |
| control | model version picker, `actions.setModelVersion` | partial | Changes which version's metrics are shown and writes no audit event: `src/store/app-store.ts#set((s) => ({ modelVersion: { ...s.modelVersion, [model]: version } }));` | read |
| control | drift alert owner, assessment and disposition, `actions.updateDrift` | partial | Session-only; every disposition, "Request independent validation" included, closes the alert and requests nothing: `src/routes/models.$id.tsx#disposition: d,` | read |
| control | validation finding status and remediation, `actions.setFindingStatus`, `actions.addAction` | partial | Any user closes a validator's finding: `src/routes/models.$id.tsx#actions.setFindingStatus(f.id, e.target.value as "Open")` | read |
| control | dataset certification, `actions.setCertification` | partial | Any user certifies, even where the page warns certification should be withheld: `src/routes/data.tsx#actions.setCertification(ds.id, e.target.value as "Certified")` | read |
| control | data access request and decision, `actions.requestAccess`, `actions.decideAccess` | mocked | Approval changes a badge and grants nothing; the request is labeled simulated (`src/routes/data.tsx#Access request submitted (simulated)`); the requester can approve their own request: `src/routes/data.tsx#actions.decideAccess(r.id, "Approved")` | read |
| control | quality issue owner and resolution, `actions.updateIssue` | partial | Session-only: `src/routes/data.tsx#actions.updateIssue(issue.id, { status: "Resolved", resolution })` | read |
| control | alert triage and close, `actions.updateAlert` | partial | Labeled simulated (`src/routes/crime.index.tsx#This simulated action is recorded in the audit trail.`); closing an alert leaves its case open: `src/routes/crime.index.tsx#actions.updateAlert(a.id, { status: "Closed" });` | read |
| control | case assignee, status and notes, `actions.updateCase`, `actions.addCaseNote` | partial | No transition rule beyond "not the current status"; the note's role is chosen on the page, not taken from an identity: `src/routes/crime.$id.tsx#actions.addCaseNote(id, note, role)` | read; run |
| control | investigation status and new actions, `actions.setInvestigationStatus`, `actions.addAction` | partial | Any user can set an investigation to Approved: `src/routes/investigations.$id.tsx#actions.setInvestigationStatus(id, e.target.value as InvStatus)` | read |
| control | action status, `actions.updateAction` | mocked | Marking an action Done writes invented completion evidence: `src/routes/investigations.index.tsx#evidence: "Marked complete (demo)"` | read |
| control | wizard "Create investigation & draft report", `actions.createInvestigation` | mocked | Drafts no report; copies INV-2025-014's findings and evidence states; the first run's id is INV-2026-014, so the rename is a no-op and the copies collide with the original's finding ids and actions: `src/routes/performance.tsx#findings: base.findings.map((f) => ({ ...f, id: f.id.replace("014", id.slice(-3)) }))`; its validation step shows fixed passes: `src/routes/performance.tsx#["Access permissions", true],` | read; maker probe in the L0 T7 Journal |
| control | copilot | mocked | Regex routing over fixtures, labeled in the panel: `src/components/AppShell.tsx#provider is connected. Arithmetic is computed deterministically.`; yet its bridge text is a literal (`src/lib/copilot.ts#Measured: volume −$18.0M`) and it sets evidence states by hand: `src/lib/copilot.ts#state: "VERIFIED",` | read |
| control | reporting-period selector | mocked | No change handler, so picking does nothing: `src/components/AppShell.tsx#aria-label="Reporting period"` | read |
| control | organization selector | mocked | One option and no change handler: `src/components/AppShell.tsx#aria-label="Organization"` | read |
| control | notifications bell | partial | Opens the audit trail; its count is labeled critical but counts every open drift alert, a third definition next to the overview's and the inventory's: `src/components/AppShell.tsx#critical notifications` | read |
| control | links to `/reports/$id` (5 sites) | absent | They resolve since L0 T3, to a placeholder that says the report is not built: `src/routes/investigations.$id.tsx#to="/reports/$id"`, `src/routes/performance.tsx#Preview linked report`, `src/lib/copilot.ts#to: "/reports/RPT-FY25-PERF"` | read; `src/test/link-integrity.test.tsx#resolves every in-app link to a route` |

## Exports

None writes an audit event or checks a permission (`src/lib/calc.ts#export function downloadFile(`).

| kind | id | status | evidence | known by |
|---|---|---|---|---|
| export | `src/components/DataTable.tsx` CSV of the tables `exportName="models"`, `exportName="data-catalog"`, `exportName="investigations"`, `exportName="actions"`, `exportName="crime-alerts"`, `exportName="audit-trail"` | partial | The toast says synthetic, the file does not; cells are not neutralized against formulas; amounts lose their currency: `src/components/DataTable.tsx#synthetic records`, `src/lib/calc.ts#export function toCSV(` | read |
| export | `src/routes/models.index.tsx` inventory CSV | partial | No synthetic label in the file: `src/routes/models.index.tsx#"model-inventory.csv",` | read |
| export | `src/routes/models.$id.tsx` model card | partial | Labeled synthetic (`src/routes/models.$id.tsx#Synthetic demo data · generated by BankIntelli POC`), but prints the picker's version, which may be a candidate, beside the lifecycle: `src/routes/models.$id.tsx#- Version: ${version}` | read |
| export | `src/routes/credit.tsx` credit report | partial | Labeled synthetic: `src/routes/credit.tsx#Credit performance report (synthetic)` | read |
| export | `src/routes/crime.$id.tsx` case summary | partial | Labeled synthetic and pseudonymous (`src/routes/crime.$id.tsx#Fictional synthetic data. Customer identifiers are pseudonymous.`), yet called "Sanitized" with no sanitizer: `src/routes/crime.$id.tsx#Sanitized summary exported` | read |
