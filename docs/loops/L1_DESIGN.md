# L1 Design

Phase 1 of `BankIntelli_Elite_Premium_Design_Roadmap.md`, "Design system and shell". Needs L0. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `BankIntelli_Elite_Premium_Design_Roadmap.md#all main routes share one coherent design language;`

Deciding rule, fixed before T1 starts: T0 to T7 are ticked, `npm run gate` exits 0, and the human's signoff line (T8), naming the widths and keyboard walk checked, is in the Journal.

## Current state (read 2026-10-28; T0 re-verifies)

- Tokens live in `src/styles.css` (IBM Plex, radius scale); shared pieces are `src/components/kit.tsx`, `src/components/charts.tsx`, `src/components/DataTable.tsx`.
- Navigation is one flat list of eight routes (`src/components/AppShell.tsx#const NAV = [`), not grouped by workflow.
- A command component exists (`src/components/ui/command.tsx`, `package.json#"cmdk": "^1.1.1",`) but the header search sends text to the canned copilot (`src/components/AppShell.tsx#placeholder="Ask BankIntelli about performance, risk, data or models…"`).
- The synthetic-data notice sits only in the sidebar footer and hides when collapsed: `src/components/AppShell.tsx#Proof of concept. All data is synthetic and belongs to the fictional Northstar Bank.`

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint, refresh citations L0 changed, read `docs/audit/VISUAL_BASELINE.md` (new) and `docs/audit/TRUST_FINDINGS.md` (new). Evidence: graph-lint exits 0.
- [ ] T1 Token rule. needs: T0. Color, radius, shadow, spacing, focus, density and chart palette come from tokens in `src/styles.css`; a test fails on hex/rgb/hsl literals or arbitrary Tailwind color values (`[#`) in src/routes and src/components outside src/components/ui. Evidence: test quoted failing with a count before, passing after.
- [ ] T2 Shell and IA. needs: T1. Group navigation as the roadmap's Overview / Intelligence / Workflow / Administration, listing only routes that exist (a group with no route is omitted, never stubbed); breadcrumbs and page titles; a persistent environment banner reading "Demo · synthetic data" on every route, visible when the sidebar is collapsed and in print. Evidence: tests: every nav entry matches a route; the banner renders on every route.
- [ ] T3 Command palette. needs: T2. Ctrl/Cmd+K opens a palette on `src/components/ui/command.tsx` listing routes and records (investigations, models, cases, datasets); the copilot stays a separate, labeled entry. Evidence: testing-library test: the shortcut opens it, typing filters, Enter navigates.
- [ ] T4 Component states. needs: T1. KPI, chart frame, data table and evidence badge each render loading, empty, error, permission denied, stale, partial, success and disabled distinctly (`BankIntelli_Elite_Premium_Design_Roadmap.md#Loading, empty, error, permission denied, stale data, partial result,`). The chart frame's props require title, unit, period and source, and it renders a table alternative. Evidence: one test per state per component; a `@ts-expect-error` test proves a chart frame without a unit does not compile.
- [ ] T5 Keyboard and motion. needs: T2, T4. Token-based focus ring, skip link, accessible names on icon-only buttons, transitions off under `prefers-reduced-motion`. An axe dependency is an escalation. Evidence: tests: every button on every route has an accessible name; Tab from page start reaches the nav and the page's primary action.
- [ ] T6 Honest copy. needs: T0. Remove or relabel shell and page claims that T5 of L0 listed (the "Verified intelligence" tagline first) and every success toast with no backing operation. Evidence: a retired-phrase test quoted failing before, passing after.
- [ ] T7 Independent check. needs: T3, T5, T6. A different model, in at least 3 independent runs, applies the links, states and accessibility attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T8 (human) Signoff. needs: T7. The human walks every route at 1440 px and 390 px and keyboard-only. Evidence: the signoff line naming what was checked.

## Journal
