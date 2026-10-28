# Capability Matrix

Written in L0 T4 (2026-10-28) from reading every file in src/routes, the store, the shell and the export helpers. `src/test/capability-matrix.test.ts` fails when a route file, a store action a route calls, or a file that calls `downloadFile` has no row here, when a status is not one of the roadmap's words, or when an implemented row names no existing test. graph-lint checks every citation below.

## Status words

From `BankIntelli_Elite_Premium_Design_Roadmap.md#Classify every feature as implemented, partial, mocked, broken,`. Rules used here:

- implemented: does what it claims, and a named test proves it. Today no row qualifies.
- partial: works inside one browser session (in-memory store, client-written audit event) but is not persisted, permissioned or attributable to a real user (`src/store/app-store.ts#let state: State = {`, `src/store/app-store.ts#user: { name: "J. Avery", role: "Chief Risk Officer" },`).
- mocked: shows synthetic fixture data, or looks live and changes nothing or invents content.
- broken: does not work as presented.
- absent: linked or planned, no code.
- not verified: code exists and was not judged.

A route row rates the data the page shows; its controls and exports have their own rows.

## Counts

32 rows: 13 routes (12 files plus the absent report route), 14 controls, 5 exports. implemented 0, partial 17, mocked 13, broken 1, absent 1, not verified 0.

## Routes

| kind | id | status | evidence | known by |
|---|---|---|---|---|
| route | `src/routes/__root.tsx` | partial | Shell, 404 and error boundary work; the page meta claims verification nothing performs: `src/routes/__root.tsx#Verified intelligence for better banking decisions.` | read |
| route | `src/routes/index.tsx` | mocked | Executive overview built from fixtures: `src/routes/index.tsx#import { DEPARTMENTS, quarterlyRevenue } from "@/data/finance";` | read; routing only: `src/test/app-routing.test.tsx#matches a page for / instead of falling back to not found` |
| route | `src/routes/performance.tsx` | mocked | Scorecard, peers and bridge from fixtures: `src/routes/performance.tsx#import { BANK, BRIDGES, DEPARTMENTS, PEER_BENCHMARK_NOTE, PEER_HISTORY, PEERS, SCORECARD } from "@/data/finance";` | read |
| route | `src/routes/credit.tsx` | mocked | Portfolio slices from fixtures: `src/routes/credit.tsx#from "@/data/credit";` | read |
| route | `src/routes/crime.index.tsx` | mocked | Alert queue seeded from fixtures: `src/routes/crime.index.tsx#import { CRIME_TREND, INVESTIGATORS_LIST, type CrimeAlert } from "@/data/crime";` | read |
| route | `src/routes/crime.$id.tsx` | mocked | Case workspace over fixture cases: `src/routes/crime.$id.tsx#import { CASES, INVESTIGATORS_LIST, type AlertStatus } from "@/data/crime";` | read |
| route | `src/routes/data.tsx` | mocked | Catalog, quality and lineage from fixtures; lineage is illustrative: `src/routes/data.tsx#import { DATASETS, DQ_DIMENSIONS, DQ_TREND, GLOSSARY, LINEAGE_EDGES, LINEAGE_NODES, type Dataset, type LineageNode } from "@/data/datasets";`, `src/lib/copilot.ts#Lineage is illustrative, not harvested from live systems` | read |
| route | `src/routes/models.index.tsx` | mocked | Inventory from fixtures: `src/routes/models.index.tsx#import { MODELS, type Model } from "@/data/models";` | read |
| route | `src/routes/models.$id.tsx` | mocked | Monitoring, drift and validation from fixtures: `src/routes/models.$id.tsx#import { DRIFT_FEATURES, FEATURE_IMPORTANCE, FORECAST_SERIES, LGD_SCATTER, MODELS, PERF_HISTORY } from "@/data/models";` | read |
| route | `src/routes/investigations.index.tsx` | mocked | Registers seeded from fixtures: `src/routes/investigations.index.tsx#import { REPORTS, type Action, type Investigation } from "@/data/investigations";` | read |
| route | `src/routes/investigations.$id.tsx` | mocked | Detail over the store's fixture copy: `src/store/app-store.ts#investigations: INVESTIGATIONS.map((i) => ({ ...i })),` | read |
| route | `src/routes/audit.tsx` | partial | Seeded events plus this session's, labeled honestly: `src/routes/audit.tsx#Session-only; not persisted.` | read |
| route | `/reports/$id` | absent | Five links point at it, no route declares it: `src/routes/index.tsx#to="/reports/$id"`; planned in `.lovable/plan/finish-the-bankintelli-poc-2026-10-28.md#Report preview` | read; typecheck at L0 T0 |

## Controls

| kind | id | status | evidence | known by |
|---|---|---|---|---|
| control | approve or reject a model, `actions.decideModel` | partial | Session-only; the person who approves sends the model straight to Production with no second person: `src/store/app-store.ts#modelLifecycle: { ...s.modelLifecycle, [model]: decision === "Approved" ? "Production" : "Development" },`; toast is labeled: `src/routes/models.$id.tsx#toast.success("Demo approval recorded")` | read |
| control | model version picker, `actions.setModelVersion` | partial | Changes which version's metrics are shown and writes no audit event: `src/store/app-store.ts#set((s) => ({ modelVersion: { ...s.modelVersion, [model]: version } }));` | read |
| control | drift alert owner, assessment and disposition, `actions.updateDrift` | partial | Session-only: `src/routes/models.$id.tsx#actions.updateDrift(alert.id, { assessment, disposition: d, status: "Closed" })` | read |
| control | validation finding status and remediation, `actions.setFindingStatus`, `actions.addAction` | partial | Any user closes a validator's finding: `src/routes/models.$id.tsx#actions.setFindingStatus(f.id, e.target.value as "Open")` | read |
| control | dataset certification, `actions.setCertification` | partial | Any user certifies: `src/routes/data.tsx#actions.setCertification(ds.id, e.target.value as "Certified")` | read |
| control | data access request and decision, `actions.requestAccess`, `actions.decideAccess` | partial | Request is labeled simulated (`src/routes/data.tsx#Access request submitted (simulated)`); the same session user who asked can approve: `src/routes/data.tsx#actions.decideAccess(r.id, "Approved")` | read |
| control | quality issue owner and resolution, `actions.updateIssue` | partial | Session-only: `src/routes/data.tsx#actions.updateIssue(issue.id, { status: "Resolved", resolution })` | read |
| control | alert triage and close, `actions.updateAlert` | partial | Labeled simulated: `src/routes/crime.index.tsx#This simulated action is recorded in the audit trail.` | read |
| control | case assignee, status and notes, `actions.updateCase`, `actions.addCaseNote` | partial | The note's role is passed from page state, not from an identity: `src/routes/crime.$id.tsx#actions.addCaseNote(id, note, role)` | read |
| control | investigation status, actions and action status, `actions.setInvestigationStatus`, `actions.addAction`, `actions.updateAction`, `actions.createInvestigation` | partial | Any user can set an investigation to Approved (`src/routes/investigations.$id.tsx#actions.setInvestigationStatus(id, e.target.value as InvStatus)`); marking an action Done writes a placeholder as evidence (`src/routes/investigations.index.tsx#evidence: "Marked complete (demo)"`) | read |
| control | wizard "Create investigation", `actions.createInvestigation` findings | mocked | Every new investigation receives INV-2025-014's findings, evidence states included, renamed to the new id: `src/routes/performance.tsx#findings: base.findings.map((f) => ({ ...f, id: f.id.replace("014", id.slice(-3)) }))` | read |
| control | copilot | mocked | Regex routing over fixtures, labeled in the panel: `src/components/AppShell.tsx#No live AI provider is connected.`; it sets evidence states by hand: `src/lib/copilot.ts#state: "VERIFIED", missing: ["Targets are synthetic budget figures"]` | read |
| control | reporting-period selector | mocked | No change handler, so picking does nothing: `src/components/AppShell.tsx#aria-label="Reporting period" defaultValue="FY2025"` | read |
| control | links to `/reports/$id` (5 sites) | broken | `src/routes/investigations.$id.tsx#to="/reports/$id"`, `src/routes/performance.tsx#Preview linked report`, `src/lib/copilot.ts#to: "/reports/RPT-FY25-PERF"` | read; typecheck at L0 T0 |

## Exports

None writes an audit event or checks a permission (`src/lib/calc.ts#export function downloadFile(`).

| kind | id | status | evidence | known by |
|---|---|---|---|---|
| export | `src/components/DataTable.tsx` CSV of any table | partial | The toast says synthetic, the file does not, and cells are not neutralized against formulas: `src/components/DataTable.tsx#synthetic records`, `src/lib/calc.ts#export function toCSV(` | read |
| export | `src/routes/models.index.tsx` inventory CSV | partial | No synthetic label in the file: `src/routes/models.index.tsx#downloadFile("model-inventory.csv"` | read |
| export | `src/routes/models.$id.tsx` model card | partial | Labeled synthetic: `src/routes/models.$id.tsx#Synthetic demo data · generated by BankIntelli POC` | read |
| export | `src/routes/credit.tsx` credit report | partial | Labeled synthetic: `src/routes/credit.tsx#Credit performance report (synthetic)` | read |
| export | `src/routes/crime.$id.tsx` case summary | partial | Labeled synthetic and pseudonymous: `src/routes/crime.$id.tsx#Fictional synthetic data. Customer identifiers are pseudonymous.` | read |
