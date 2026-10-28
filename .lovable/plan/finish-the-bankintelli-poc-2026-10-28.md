# Finish the BankIntelli POC

Already built: design system, synthetic data for Northstar Bank, shared store with audit logging, app shell (sidebar, top bar, copilot), Executive Overview, Model Governance (inventory + detail), Data Governance, Credit Intelligence, Financial Crime (alerts + case workspace).

## Remaining work

1. **Performance & Peers page** (`/performance`)
   - Executive scorecard (NII, NIM, CIR, ROA, ROE, credit/deposit growth) with period, basis and source.
   - Department comparison table and chart vs target and prior year.
   - Peer benchmarking: peer selection, metric selection, source type, comparability warnings, NIM history chart.
   - Revenue-gap bridge with method switcher (peer / budget / prior); shows reconciliation check.
   - Guided 11-step root-cause investigation wizard that creates a new investigation and links to the report.

2. **Investigations & Reports** (`/investigations`, `/investigations/$id`)
   - Investigation register with filters; action register with create and status updates; report library.
   - Detail page: scope, findings (measured vs hypothesis, evidence state), contradictions, limitations, status changes, add action from a finding.

3. **Report preview** (`/reports/$id`)
   - All 14 sections of the full-year report, print button, downloadable HTML and Markdown.
   - Verified label only when all findings are verified and reviewer signs off; otherwise shows the actual state.

4. **Audit Trail** (`/audit`) — filterable timeline of all simulated changes.

5. **Quality pass**
   - Fix type issues from string links (copilot/next-step links).
   - Unit test: revenue bridges reconcile exactly; KPI formulas (cost-to-income, PSI).
   - Run tests, check build log, smoke-test key flows in the browser.
   - Record architecture rules in AGENTS.md; save design preferences to memory.

## Technical details
- In-memory store (useSyncExternalStore) — changes persist for the session only; no backend connected.
- Copilot is predefined analytical routing, clearly labelled; no live AI provider.
