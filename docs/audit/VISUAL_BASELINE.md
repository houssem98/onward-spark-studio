# Visual Baseline

Captured in L0 T6 (2026-10-28) with Playwright (`playwright-core` 1.64.1, run from the session scratchpad, not a repository dependency) driving the installed Chrome headless against `vite dev`, every page route at 1440×900 and 390×844, one screenshot per route and width (kept in the scratchpad, not the repository). Each page was also measured in the browser: HTTP status, horizontal overflow (document width minus viewport width), console errors, visible buttons without an accessible name, visible form fields without a label, text nodes under 11 px, and whether the sidebar's synthetic notice is visible. Screenshots reviewed by eye: all routes at 1440 except reports with an unknown id; at 390 only the executive overview. `src/test/visual-baseline.test.ts` fails when a page route has no row at both widths.

## Findings across all pages

- **Two detail pages never render (fixed in L0 T10).** `/models/MDL-002` and `/crime/CASE-0917` showed the error page ("This page didn't load") at both widths, with `The result of getServerSnapshot should be cached to avoid an infinite loop` followed by `Maximum update depth exceeded`. Cause: the store handed React a fresh array from selectors such as `src/routes/crime.$id.tsx#s.audit.filter((a) => a.entity === id)` as the snapshot. Present in the original commit 331ac73. The T4 matrix rated both pages mocked from reading the code; running them showed broken. L0 T10 made the stable state the snapshot (`src/store/app-store.ts#return selector(useSyncExternalStore(subscribe, getState, getState));`); a full recapture then showed both pages with their own h1 and 0 console errors, and the rows below are from that recapture.
- **Phone width is not supported.** At 390 px every page scrolls sideways (53 to 356 px): the sidebar keeps its width and does not collapse or become a drawer, KPI values are clipped (`$1,0…`), and the overview's question bar is cut off.
- **Hydration mismatches.** `/credit` logs `Hydration failed because the server rendered text didn't match the client` at both widths in both captures; `/investigations` at 390 logged an attribute mismatch in the first capture and not in the L0 T10 recapture, so it is intermittent.
- **Identifiers wrap mid-token** in tables (`MDL-` / `001`, `INV-` / `2025-` / `014`, dates split after the month), which hurts scanning.
- **Good:** every page header carries a "Synthetic demo data" tag, the sidebar states the data is synthetic, no visible button lacks a name, no visible field lacks a label, and every page has one h1. 4 text nodes per page are under 11 px (the 10 px sidebar notice and tag text).

## Per route

| route | width | HTTP | overflow | console errors | h1 | notes |
|---|---|---|---|---|---|---|
| `src/routes/index.tsx` | 1440 | 200 | 0 | 0 | Executive Overview | 8 KPI tiles where the roadmap asks for 4 to 6; charts state unit and period in the subtitle; report cards show evidence state; "Data quality 96.1" is labeled simulated. |
| `src/routes/index.tsx` | 390 | 200 | 240 | 0 | Executive Overview | Sidebar takes 240 of 390 px; KPI values and the question bar are clipped. |
| `src/routes/performance.tsx` | 1440 | 200 | 0 | 0 | Enterprise Performance & Competitor Intelligence | Scorecard of 10 KPIs; the second row has no delta or basis line; honest note that market share is not shown for lack of a comparable source. Charts sit behind tabs (0 on the first tab). |
| `src/routes/performance.tsx` | 390 | 200 | 53 | 0 | Enterprise Performance & Competitor Intelligence | Sideways scroll. |
| `src/routes/credit.tsx` | 1440 | 200 | 0 | 1 | AI Credit Intelligence | Hydration text mismatch. "Breakdown" draws balance (USD M) and NPL % as grouped bars on two axes; the revenue trend's axis starts at 27.55 with the unit only in the subtitle. |
| `src/routes/credit.tsx` | 390 | 200 | 356 | 1 | AI Credit Intelligence | Worst overflow: the six-filter bar does not wrap. |
| `src/routes/crime.index.tsx` | 1440 | 200 | 0 | 0 | Fraud, AML & Financial Crime | Clear disclaimer that alerts are not determinations; false-positive rate shown as N/A with the reason; alert ids and investigator names wrap. |
| `src/routes/crime.index.tsx` | 390 | 200 | 134 | 0 | Fraud, AML & Financial Crime | Sideways scroll. |
| `src/routes/crime.$id.tsx` | 1440 | 200 | 0 | 0 | Repeated sub-threshold cash deposits | After L0 T10 (before: error page, 7 errors). Workflow stepper with confirmable moves; transactions, entities, evidence register, notes, timeline. Evidence register shows a hand-set VERIFIED (F1); the note textarea has no label. |
| `src/routes/crime.$id.tsx` | 390 | 200 | 380 | 0 | Repeated sub-threshold cash deposits | After L0 T10. Widest overflow of any page. |
| `src/routes/data.tsx` | 1440 | 200 | 0 | 0 | Data Governance & Data Intelligence | Catalog rows say "(simulated)"; "Avg quality score" labeled simulated; lineage disclaimer in the header; "Quality*" asterisk has no visible key on the first screen. |
| `src/routes/data.tsx` | 390 | 200 | 226 | 0 | Data Governance & Data Intelligence | Sideways scroll. |
| `src/routes/models.index.tsx` | 1440 | 200 | 0 | 0 | AI, Machine Learning & Model Governance | Overdue review shown in red with text; Env and Lifecycle columns repeat "Production"; model ids wrap. |
| `src/routes/models.index.tsx` | 390 | 200 | 281 | 0 | AI, Machine Learning & Model Governance | Sideways scroll. |
| `src/routes/models.$id.tsx` | 1440 | 200 | 0 | 0 | SME Credit Risk Model | After L0 T10 (before: error page, 7 errors). Eight tabs; registry record; operational health labeled simulated; the next review date (2025-11-03) is past but the overview does not say overdue, while the inventory does. |
| `src/routes/models.$id.tsx` | 390 | 200 | 75 | 0 | SME Credit Risk Model | After L0 T10. Sideways scroll. |
| `src/routes/investigations.index.tsx` | 1440 | 200 | 0 | 0 | Investigations & Reports | Dense registers; ids, dates and report ids wrap; action status is an inline select with no confirmation. |
| `src/routes/investigations.index.tsx` | 390 | 200 | 179 | 1 | Investigations & Reports | Hydration attribute mismatch; sideways scroll. |
| `src/routes/investigations.$id.tsx` | 1440 | 200 | 0 | 0 | Credit revenue growth vs peers | Strong layout: scope, then findings with evidence, source and period, method, impact, limitations, next step. Finding F-014-2 shows VERIFIED, a hand-set state (trust finding F1); the header status select offers Approved to anyone (F3). |
| `src/routes/investigations.$id.tsx` | 390 | 200 | 78 | 0 | Credit revenue growth vs peers | Sideways scroll. |
| `src/routes/audit.tsx` | 1440 | 200 | 0 | 0 | Audit Trail & Activity | Honest "Session-only; not persisted" subtitle; 4 seeded events. |
| `src/routes/audit.tsx` | 390 | 200 | 63 | 0 | Audit Trail & Activity | Sideways scroll. |
| `src/routes/reports.$id.tsx` | 1440 | 200 | 0 | 0 | FY2025 Full-Year Performance Review | Placeholder from L0 T3 renders with breadcrumb and warning; an unknown id renders "Report NO-SUCH-REPORT" and says no report has that id. |
| `src/routes/reports.$id.tsx` | 390 | 200 | 53 | 0 | FY2025 Full-Year Performance Review | Sideways scroll. |
