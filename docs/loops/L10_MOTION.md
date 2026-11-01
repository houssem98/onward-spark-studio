# L10 Motion

Phase 10 of `docs/roadmap/DESIGN_MOTION_ROADMAP.md`, "Motion: tokens, primitives and choreography". Needs L9. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`; driver `BANKINTELLI_DESIGN_LOOP.md`.

Target: `docs/roadmap/DESIGN_MOTION_ROADMAP.md#motion comes only from tokens; the four primitives exist with tests;`

Deciding rule, fixed before T1 starts: T0 to T8 are ticked, `npm run gate` exits 0, `npm run e2e` exits 0, and the human's signoff line (T9), naming the routes walked with motion on and with reduced motion, is in the Journal.

## Current state (read 2026-11-01; T0 re-verifies)

- Two hand-timed animations: the page entrance (`src/styles.css#animation: page-in 320ms cubic-bezier(0.2, 0.7, 0.2, 1) both;`, used by `src/components/AppShell.tsx#className="page-enter`) and the card lift (`src/styles.css#transition: box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease;`).
- Radix overlays animate through tw-animate-css (`src/components/ui/dialog.tsx#data-[state=open]:animate-in`).
- The reduced-motion rule covers CSS only (`src/styles.css#@media (prefers-reduced-motion: reduce) {`); Recharts series still animate (`docs/audit/TRUST_FINDINGS.md#F39 · low · Charts still animate when the user asks for reduced motion`), except the bridge waterfall, which never animates (`src/components/charts.tsx#isAnimationActive={false}`).
- The router sets no view transition (`src/router.tsx#scrollRestoration: true,`).
- No motion package: the stack is native (`docs/roadmap/DESIGN_MOTION_ROADMAP.md#Native stack, zero new runtime dependencies`).

## Tasks

- [ ] T0 Re-verify and inventory. needs: none. Run graph-lint; list every animation and transition in src with file, trigger, duration, easing and reduced-motion behaviour under Current state. Evidence: graph-lint exits 0; the inventory names each file.
- [ ] T1 Motion tokens. needs: T0. The duration, easing and stagger tokens of `docs/roadmap/DESIGN_MOTION_ROADMAP.md#Tokens (L10 T1)` in `src/styles.css`; page entrance, card lift and the overlay durations read them. `src/test/design-tokens.test.ts` grows: no raw `ms` duration or `cubic-bezier` in src/routes and src/components, nor in CSS outside the theme block. Evidence: the test quoted failing with the count before and passing after.
- [ ] T2 Primitives. needs: T1. `src/components/motion.tsx` (new): `useReducedMotion`, `Reveal` (IntersectionObserver, once, content visible without it), `Stagger` (at most 6 children), `AnimatedNumber` (tweens only on a change after mount, straight, no overshoot). Evidence: tests: reduced motion shows the final state at once; the accessible text of an `AnimatedNumber` equals the final value at every frame of a tween; the server markup equals the first client render.
- [ ] T3 Charts. needs: T2. `ChartFrame` hands its series the motion settings: entrance and filter-change animation at `--duration-data`, off under reduced motion; axes never animate. Takes F39 from L8 T5 and re-points its Fix line to L10 T3. Evidence: a test with reduced motion mocked: every series inside every framed chart has animation off, quoted failing before; F39 status fixed.
- [ ] T4 Navigation. needs: T2. Route changes use the router's view transitions; the active nav item's indicator slides; the sidebar collapses with a width transition; nothing of this runs under reduced motion. Evidence: Playwright, motion on and reduced: every nav entry lands on its route with its h1 and no page error; cumulative layout shift below 0.1 per route change, measured with a `layout-shift` PerformanceObserver and quoted.
- [ ] T5 Figures and registers. needs: T3. KPI values use `AnimatedNumber` when a filter or period changes them; row hover, selection and drawer open keep the selected record in view and in the URL. Evidence: tests: no tween on first render, a tween on change, final text equal to the repository value; Playwright: change a credit filter and read the final KPI values.
- [ ] T6 Choreography. needs: T4, T5. Overview and module pages reveal sections in order with `Reveal` and `Stagger`, the whole sequence within 400 ms. Evidence: Playwright: each page's primary action is clicked successfully within 500 ms of navigation; with JavaScript-driven reveal disabled the content is still visible.
- [ ] T7 Motion budget. needs: T6. Playwright records long tasks and dropped frames during a route change and a chart entrance on the overview and credit pages, and asserts a budget the Journal states before the measurement. Evidence: the measured numbers quoted with the budget; the test fails on a deliberate 300 ms busy loop, then passes.
- [ ] T8 Independent check. needs: T7. Council per `docs/LOOP_CONVENTIONS.md#Council protocol` with the motion and accessibility attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T9 (human) Signoff. needs: T8. The human walks every route at 1440 px and 390 px with motion on and with reduced motion, and keyboard-only. Evidence: the signoff line naming what was checked.

## Journal
