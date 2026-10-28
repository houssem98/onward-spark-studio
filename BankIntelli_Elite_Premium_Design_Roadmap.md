# BankIntelli --- Elite Premium Enterprise Banking Intelligence Product Roadmap

**Product:** BankIntelli (repository:
https://github.com/houssem98/onward-spark-studio)\
**Goal:** Transform the current product into a premium, secure,
evidence-led banking intelligence workspace.\
**Guiding principle:** Institutional credibility beats decorative
complexity. Every chart, status, claim and interaction must earn trust.

> **Implementation note:** Preserve the existing React 19, TypeScript,
> TanStack Start/Router, TanStack Query and Tailwind foundation unless
> baseline tests reveal a concrete reason to change. This is a
> design/product roadmap, not a claim that uninspected integrations or
> features already work.

------------------------------------------------------------------------

## 1. Product positioning

BankIntelli should bring six disciplines into one coherent workspace:

1.  **Executive intelligence:** bank performance, early warnings,
    drivers, scenarios and decision tracking.
2.  **Credit intelligence:** portfolio health, lending performance,
    concentration, delinquency, loss and risk-adjusted returns.
3.  **Financial crime:** alert triage, investigations, evidence,
    reviewer workflows and audit.
4.  **Data intelligence:** catalog, quality, lineage, ownership,
    certification and impact analysis.
5.  **AI/model governance:** inventory, validation, drift, approvals,
    limitations and remediation.
6.  **Performance and peer intelligence:** comparable metrics, variance
    decomposition, source-backed benchmarking and executive reports.

Competitive design references should be translated into product
principles rather than copied: Moody's analytical rigor; FIS and Temenos
enterprise-operating context; Collibra/Solidatus governance and lineage;
SAS-style analytics; CRISIL/Coalition Greenwich research and
benchmarking. These firms operate different businesses and should not be
treated as one identical product category.

## 2. Design vision: "Institutional Intelligence"

### Desired feel

-   Premium and composed, not flashy.
-   Dense enough for professional banking work, but with deliberate
    hierarchy and whitespace.
-   Clear typography, precise number formatting, quiet surfaces,
    restrained color and excellent tables.
-   Strong evidence and data-freshness cues.
-   Fast navigation and keyboard-friendly workflows.
-   Every module feels like part of the same product.
-   Responsive and accessible, including keyboard navigation and
    meaningful chart alternatives.

### Visual system

-   **Foundation:** warm off-white or deep ink surfaces, depending on
    the chosen theme; avoid pure-black-on-neon "hacker dashboard"
    styling.
-   **Primary:** deep navy/ink for navigation and structural hierarchy.
-   **Accent:** one restrained blue/teal accent for active state and key
    interaction.
-   **Semantic colors:** green for confirmed positive/healthy states;
    amber for attention; red for critical risk; gray for
    unknown/unavailable. Never rely on color alone.
-   **Typography:** one highly legible UI family with tabular numerals
    for financial values; distinguish page titles, KPI values, labels,
    source metadata and body copy.
-   **Spacing:** consistent 4/8-based spacing scale; aligned card edges
    and table columns.
-   **Surfaces:** subtle borders, limited shadows, consistent radii;
    avoid every metric becoming a separate floating card.
-   **Motion:** short, functional transitions only; respect
    reduced-motion settings.
-   **Charts:** restrained palette, direct labels where possible, clear
    units, period, source and comparison baseline. Avoid decorative
    charts without a decision purpose.

### Design tokens to implement

Centralize color, typography, spacing, border, radius, shadow, focus,
elevation, density and chart tokens. Do not hard-code one-off styles on
each page.

## 3. Information architecture

### Global shell

-   Organization / environment indicator (Demo vs Production).
-   Left navigation grouped by decision workflow, not just technical
    feature names.
-   Global command/search palette.
-   Breadcrumbs and page titles.
-   Date/period selector where contextually relevant.
-   Notifications and tasks requiring attention.
-   User profile, role and access context.
-   Persistent source-freshness / connector-health entry point.
-   Consistent page-level actions, such as Export, Save view, Create
    investigation and Request review.

### Recommended navigation

**Overview** - Executive Overview - My Work / Approvals

**Intelligence** - Performance & Peers - Credit Intelligence - Financial
Crime - Data Intelligence - AI & Model Governance

**Workflow** - Investigations - Reports - Actions & Remediation

**Administration** - Sources & Integrations - Access & Policies - Audit
Trail - Settings

Use progressive disclosure: avoid showing every secondary tool in the
primary navigation. Navigation must reflect actual working routes; never
include dead or fake destinations.

## 4. Signature experience: Executive Investigation

This should be the defining product experience and the standard to which
every other module is held.

Example question: "Why did our credit division underperform its peer
benchmark in FY2025?"

### Workspace layout

1.  **Question and scope:** question, entity, department, reporting
    period, currency, comparison cohort and definitions.
2.  **Executive finding:** concise answer with evidence state and key
    limitations.
3.  **KPI comparison:** actual vs target, prior period and comparable
    peers.
4.  **Variance bridge:** volume, pricing, product mix, funding cost,
    fees and unexplained residual, with deterministic reconciliation.
5.  **Evidence panel:** source, field, period, as-of date, methodology,
    freshness, permission and exact citation.
6.  **Measured vs hypothesis:** visually distinct findings, hypotheses
    and unresolved questions.
7.  **Contradictions and gaps:** missing data, stale sources,
    inconsistent definitions and comparability limitations.
8.  **Actions:** accountable owner, due date, status and review trail.
9.  **Report history:** immutable report versions, reviewer comments and
    approval decisions.

### Interaction details

-   Clicking a number opens its definition, formula, inputs and source.
-   Clicking a finding opens the supporting evidence, not a generic
    details modal.
-   Filters update results predictably and are reflected in the URL
    where useful.
-   Every long-running workflow shows progress, cancellation/retry
    behavior and recoverable errors.
-   Empty states explain what is missing and the next permitted action.
-   Draft, verified, partially verified, conflicting and unavailable are
    distinct states.
-   Reports clearly show whether the underlying data is synthetic, live,
    stale or incomplete.

### Non-negotiable trust rule

A model cannot set a claim to Verified simply by generating confident
language. Verification is assigned by deterministic policy after source
authority, entity, period, freshness, calculation and reconciliation
checks.

## 5. Premium design specification by module

### A. Executive Overview

**Purpose:** Answer "What needs my attention today?"

-   4--6 decision-driving KPIs rather than a wall of cards.
-   Revenue and profitability trends, credit health, risk exposures,
    data-quality exceptions and model-governance issues.
-   "Needs attention" queue prioritized by materiality, urgency and
    owner.
-   Period-over-period and target comparisons with definitions.
-   A clear "Start investigation" action.
-   Each summary has a source/freshness state and drilldown.
-   Synthetic figures must be clearly labeled across screen and exports.

### B. Performance & Peer Intelligence

-   Bank and department scorecards.
-   Metric definitions and comparability metadata.
-   Peer selection with source, reporting period, currency, scope and
    caveat.
-   Variance bridge with exact reconciliation and explicit residual.
-   Historical trends and benchmark distribution where data permits.
-   Distinguish actual facts, licensed benchmarks, estimates and
    unavailable data.
-   Never fill private competitor gaps with invented values.

### C. Credit Intelligence

-   Portfolio overview, origination funnel, vintage/cohort performance
    and segment filters.
-   Delinquency buckets, roll rates, NPL, loss, recoveries, collateral
    and concentration.
-   Exposure by industry, geography, product and risk band when
    authorized.
-   Stress/scenario assumptions displayed beside the result.
-   Clear separation of observed metrics, model outputs and scenario
    estimates.
-   Drill from aggregate KPI to permitted segment-level evidence.

### D. Financial Crime

-   Alert queue with risk, status, age, investigator and next action.
-   Case workspace with timeline, source references, notes and reviewer
    decisions.
-   Explain model/rule version and alert rationale.
-   Least-privilege access, masking and complete audit of sensitive
    operations.
-   No customer-sensitive content sent to an external model by default.
-   Avoid sensational visuals; prioritize calm, fast investigator
    workflow.

### E. Data Intelligence

-   Searchable catalog with owner, steward, classification, quality and
    freshness.
-   Lineage graph with upstream/downstream impact.
-   Quality issue workflow with severity, evidence, remediation and
    certification.
-   Glossary and metric definitions shared across reports.
-   Lineage discovered from metadata must be distinguished from
    illustrative/manual lineage.

### F. AI & Model Governance

-   Model inventory, owner, intended use, tier, validation status and
    version.
-   Monitoring windows, baselines, drift, performance and thresholds.
-   Validation evidence, approval history, limitations and remediation.
-   Explain that drift is an investigation signal, not proof of model
    failure.
-   Prevent unauthorized self-approval where separation of duties
    applies.

### G. Reports, Actions & Audit

-   Versioned reports with scope and evidence snapshots.
-   Reviewer assignment, comments, approve/reject and rework flow.
-   Action register with owner, due date, dependency and overdue state.
-   Searchable audit events: actor, authority, action, target,
    timestamp, outcome and correlation ID.
-   Export events themselves must be audited and permission-checked.

## 6. Reusable component system

Build a consistent component library before polishing every page
independently.

### Data components

-   KPI with definition, unit, period, trend and source state.
-   Chart frame with title, unit, period, legend, source/freshness and
    table alternative.
-   Financial data table with sorting, server pagination, column
    visibility, saved filters and export.
-   Metric definition drawer.
-   Variance bridge and reconciliation summary.
-   Peer comparability indicator.
-   Data freshness and source provenance indicator.

### Evidence components

-   Evidence state badge with explanatory tooltip.
-   Citation/source card.
-   Claim-to-evidence mapping.
-   Contradiction panel.
-   Missing-data / unavailable state.
-   Calculation methodology and input inspector.
-   Synthetic/demo data watermark and environment banner.

### Workflow components

-   Investigation stepper.
-   Review/approval panel.
-   Owner and due-date picker.
-   Audit timeline.
-   Confirmation dialog for consequential actions.
-   Toasts for completed actions and persistent error panels for
    failures.

### Required states for every important component

Loading, empty, error, permission denied, stale data, partial result,
success and disabled state. Do not fake a successful action when no
backend operation occurred.

## 7. Architecture roadmap

### Phase 0 --- Baseline and design audit

-   Run clean install, typecheck, lint, tests and production build.
-   Inventory routes, component reuse, responsive behavior and broken
    interactions.
-   Classify every feature as implemented, partial, mocked, broken,
    absent or not verified.
-   Record screenshots and interaction notes at desktop and narrow
    viewport widths.
-   Establish a visual and functional baseline before changes.

**Exit criteria:** reproducible build; baseline test report; no unknown
primary navigation destinations.

### Phase 1 --- Design system and shell

-   Define design tokens and typography.
-   Refine navigation, headers, global search and environment indicator.
-   Standardize tables, filters, charts, drawers and dialogs.
-   Add keyboard focus, accessibility labels and reduced-motion support.
-   Remove visual inconsistencies and redundant cards.

**Exit criteria:** all main routes share one coherent design language;
core workflows are keyboard usable.

### Phase 2 --- Data boundaries and safe demo mode

-   Create typed API/data-access interfaces instead of importing demo
    arrays directly into pages.
-   Keep synthetic fixtures behind a dedicated demo adapter.
-   Add visible demo/production environment state.
-   Centralize metric units, currencies, periods and definitions.
-   Ensure demo fixtures never masquerade as production telemetry.

**Exit criteria:** demo data is isolated; the UI can switch to an
API-backed repository without rewriting every page.

### Phase 3 --- Identity, authorization and persistence

-   Implement server-enforced identity and roles.
-   Enforce tenant and resource permissions on every read, update,
    search and export.
-   Add durable storage for investigations, reports, actions, approvals
    and audit events.
-   Add migrations, backups, restore tests and retention policy.
-   Test direct-object-ID access and cross-tenant leakage.

**Exit criteria:** no production data is accessible through client-side
filtering alone; critical actions persist across sessions.

### Phase 4 --- Evidence and source registry

-   Define source records, claims, calculation metadata and evidence
    states.
-   Track source authority, entity, reporting period, freshness, units,
    licensing and version.
-   Create a deterministic verification policy service.
-   Persist evidence snapshots with report versions.
-   Reject unsupported transitions to Verified.

**Exit criteria:** every material report claim is linked to evidence or
explicitly marked hypothesis, unverified, conflicting or unavailable.

### Phase 5 --- Complete flagship investigation

-   Implement scope resolution, authorized retrieval, deterministic
    calculations, reconciliation, contradiction handling, report
    generation and human review.
-   Test the synthetic credit-vs-peer example as a demo-only golden
    case.
-   Connect one approved real source end-to-end before adding multiple
    connectors.
-   Make reports reproducible from saved input/evidence versions.

**Exit criteria:** an executive can ask a question and reach a reviewed,
source-linked report with traceable limitations.

### Phase 6 --- Domain integrations

-   Add performance/peer sources first, with licensed and comparable
    data.
-   Add credit portfolio data and controlled scenarios.
-   Add data catalog/lineage and quality systems.
-   Add model monitoring and validation workflows.
-   Add financial-crime systems only after sensitive-data access
    controls and security review are proven.

**Exit criteria:** each integration has contract tests, freshness
monitoring, retry behavior and clear failure states.

### Phase 7 --- Controlled AI orchestration

-   Use the model for intent interpretation, scope proposals and report
    drafting.
-   Use deterministic tools for financial arithmetic, reconciliation and
    evidence-state assignment.
-   Restrict tools by user permissions and task scope.
-   Treat source documents as untrusted input.
-   Evaluate citation precision, unsupported claims, calculation
    accuracy, latency, cost and robustness.

**Exit criteria:** no unsupported verified claims in the golden
evaluation suite; AI cannot bypass permissions or approve its own work.

### Phase 8 --- Enterprise readiness

-   CI checks, integration tests and browser E2E coverage.
-   Structured logs, traces, correlation IDs and connector health.
-   Backup/restore and incident-response drills.
-   Accessibility and performance budgets.
-   Security review and remediation of critical/high findings.
-   Pilot documentation, deployment guide, data source limitations and
    operational runbooks.

**Exit criteria:** the pilot is safe, supportable and auditable---not
merely visually impressive.

## 8. Design and engineering acceptance criteria

### Visual quality

-   Consistent typography, spacing, borders, semantic status colors and
    table density.
-   No dead buttons, broken navigation or fake success feedback in
    primary workflows.
-   No chart without clear units, period and purpose.
-   Responsive layouts and accessible keyboard focus.
-   Important actions and evidence are visible without excessive modal
    stacking.

### Trust and analytical quality

-   All calculations have unit and edge-case tests.
-   Every peer comparison documents source, period, scope and
    comparability.
-   Every material claim links to evidence or declares its limitations.
-   Conflicts and stale data remain visible.
-   Report versions are reproducible.
-   Synthetic data is labeled on screen and in exports.

### Security and operations

-   Server-side tenant and role enforcement.
-   No secrets in repository or client bundle.
-   Audited access, changes, approvals and exports.
-   Backups and restore tests.
-   Connector freshness, failure and retry monitoring.
-   No critical/high security findings open before production pilot.

## 9. First 15 implementation tickets

1.  Add or verify `typecheck`, lint, test and build CI jobs.
2.  Capture a route-by-route visual/functional baseline.
3.  Define design tokens and component usage rules.
4.  Refactor the app shell and global navigation.
5.  Standardize KPI, table, chart and evidence components.
6.  Add universal Demo/Production and data-freshness indicators.
7.  Add unit tests for calculation edge cases and reconciliation.
8.  Define typed API contracts and a repository/data-access layer.
9.  Isolate synthetic fixtures behind a demo adapter.
10. Design tenant, identity, role and policy boundaries.
11. Add durable persistence for investigations and reports.
12. Create canonical source, claim and evidence schemas.
13. Implement deterministic evidence-state policy and tests.
14. Complete the credit-vs-peer investigation and reviewed report
    lifecycle.
15. Run security, accessibility and E2E gates before live bank
    integrations.

## 10. Definition of "world-class"

BankIntelli is world-class when a banking professional can trust its
conclusions, understand their limitations, reproduce its numbers, drill
into evidence, collaborate on a decision and prove who approved what.

It should feel premium because it is clear, fast, composed and
reliable---not because it has gradients, animations or a huge number of
dashboard widgets.

**Strategic recommendation:** build one excellent, secure,
evidence-backed investigation workflow on top of a refined design
system. Then reuse that trust and workflow foundation across credit,
model risk, data governance, financial crime and enterprise performance.
