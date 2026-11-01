# BankIntelli Design & Motion Roadmap

The design track: art direction, purposeful motion, explainable-credit visuals, and browser proof. It turns the brief in desigh-elit.md (repository root, two pasted roadmaps) into three loops, L9 to L11, inside the existing graph `docs/LOOP_GRAPH.md`. The driver is `BANKINTELLI_DESIGN_LOOP.md`; the rules are `docs/LOOP_CONVENTIONS.md`, unchanged except where this track adds attacks. L0 to L2 already delivered the baseline, the token system, the shell and computed figures, so this track starts from them instead of redoing them.

## 1. North star

BankIntelli looks and moves like a world-class institutional product without giving up a single trust property. Each property is a check, not a promise:

| Property | Enforced by |
|---|---|
| One art direction | L9 T4 human pick; token tests in `src/test/design-tokens.test.ts` grow to cover it |
| Text stays readable | L9 T5 contrast test computed from the tokens, no new dependency |
| Motion never misstates a number | L10 T2 test: an animated figure's accessible text is the final value at every frame |
| Motion respects the user | L10 T3 and T4: nothing animates under reduced motion, JavaScript charts included |
| Explanations reconcile | L11 T1 test: baseline plus contributions equals the model output at 4 dp, for every case |
| It works in a real browser | L9 T2 Playwright sweep: every route, six widths, no overflow, no page error |

Taste is judged by the human at each signoff, at 1440 px and 390 px (`docs/LOOP_CONVENTIONS.md#Visual quality is judged by the human at each signoff, at 1440 px and 390 px widths.`). Machines check the six widths; the human judges two.

## 2. What the check of desigh-elit.md found (read 2026-11-01)

| Brief says | Repository says | Consequence |
|---|---|---|
| React 19, TanStack Start, Tailwind 4, Radix, Recharts, Lucide | true (`package.json#"@tanstack/react-router": "1.170.41",`, `package.json#"recharts": "^2.15.4",`) | kept, no migration |
| "Existing Supabase integrations" | false: no Supabase client in `package.json`; data comes from the demo repository | nothing in this track touches a backend; identity stays L3 |
| Phase 0 baseline in a new docs/design-audit folder | already done in L0 as `docs/audit/VISUAL_BASELINE.md` | no duplicate directory; L9 T0 adds a six-width section there |
| Phases 1 to 4: tokens, primitives, shell, command palette, states | done and signed off in L1 (`src/components/CommandPalette.tsx`, `src/test/accessibility.test.tsx`) | this track refines them; it does not rebuild them |
| Install Motion (motion.dev) | not installed; Radix overlays already animate with `src/components/ui/dialog.tsx#data-[state=open]:animate-in` from `package.json#"tw-animate-css": "^1.3.4",` | native first (section 4); the package only if a failing test cannot pass without it, as an I7 escalation |
| Playwright tests in `tests/e2e/` | Playwright is not a dependency; L0 and L1 drove Chrome from the session scratchpad; an E2E runner is a human decision in `docs/loops/L8_ENTERPRISE.md#T2 (human) Browser E2E.` | L9 T1 asks that decision now; specs go in `e2e/` so Vitest (src only) never collects them |
| Evaluate Inter or Geist | IBM Plex with tabular figures globally (`src/styles.css#--font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;`, `src/styles.css#font-feature-settings: "tnum" 1;`) | font change is part of the L9 T4 direction choice; keeping Plex is the default |
| SHAP beeswarm, importance, individual waterfall | only global mean absolute SHAP, hand-set, for some models (`src/data/models.ts#export const FEATURE_IMPORTANCE`); no per-case baseline or contributions | L11 T1 adds a labeled synthetic explanation fixture behind the repository and derives importance from it |
| Reduced motion respected | CSS rule exists (`src/styles.css#@media (prefers-reduced-motion: reduce) {`), but Recharts animates in JavaScript (`docs/audit/TRUST_FINDINGS.md#F39 · low · Charts still animate when the user asks for reduced motion`) | L10 T3 fixes F39 |
| OpenDesign `od mcp install claude`; the Medium article's motion | not verified this session: no network read of either | treated as optional inspiration behind a human decision, never as a source of truth |

## 3. Tools: who does what

| Tool from the brief | Decision | Gate |
|---|---|---|
| frontend-design and impeccable skills | installed locally; used in L9 T3 to critique the three directions, never to generate production code unread | the human's pick in L9 T4 |
| design-critique and accessibility-review skills | installed; second opinions inside council checks | council protocol |
| OpenDesign, UI UX Pro Max | optional exploration outside the repository, only after the human approves installing them (L9 T4 asks) | escalation: external tool, files the loop did not write |
| Figma | connector present but not authorized in this environment; optional manual review only | none |
| shadcn/ui | already the component base (`components.json`) | existing tests |
| Motion (motion.dev) | not adopted; see section 4 | I7 escalation if a test needs it |
| Playwright | `@playwright/test` as a dev dependency driving the installed Chrome (`channel: "chrome"`, no browser download) | L9 T1 human decision (`docs/LOOP_CONVENTIONS.md#I7 No new dependency`) |
| axe | not adopted (`docs/loops/L1_DESIGN.md#An axe dependency is an escalation.`); contrast is computed in a unit test, names and focus by the existing sweep | escalation if wanted |

## 4. Motion system

Native stack, zero new runtime dependencies: CSS custom properties and keyframes, tw-animate-css for Radix overlays, Recharts' own animation props, TanStack Router view transitions (`defaultViewTransition`, a no-op in browsers without the View Transitions API), IntersectionObserver for reveal-on-view, and `requestAnimationFrame` for number transitions.

Tokens (L10 T1), starting values; `src/styles.css#animation: page-in 320ms cubic-bezier(0.2, 0.7, 0.2, 1) both;` and `src/styles.css#transition: box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease;` move onto them:

| Token | Value | Used for |
|---|---|---|
| `--duration-instant` | 120ms | hover, press feedback |
| `--duration-quick` | 160ms | tooltips, toggles, tabs |
| `--duration-base` | 220ms | dropdowns, dialogs, drawers |
| `--duration-page` | 260ms | route transition, page entrance |
| `--duration-data` | 500ms | chart series entrance, bar growth |
| `--stagger` | 40ms | sibling reveal, at most 6 siblings |
| `--ease-standard` | cubic-bezier(0.2, 0, 0, 1) | most transitions |
| `--ease-enter` | cubic-bezier(0.05, 0.7, 0.1, 1) | elements arriving |
| `--ease-exit` | cubic-bezier(0.3, 0, 1, 1) | elements leaving |

Rules, each owned by a test:

1. Animate to explain a change, a relationship or a sequence; never as decoration (`BankIntelli_Elite_Premium_Design_Roadmap.md#Avoid decorative`).
2. Numbers: a figure tweens only when its value changes after mount, straight from old to new, no overshoot, at most `--duration-base`; its accessible text is the final value from the first frame; nothing tweens on first render.
3. Charts: series animate on entrance and on filter change; axes and baselines never animate, so a comparison cannot mislead mid-flight.
4. Reduced motion: every animation, CSS or JavaScript, reaches its final state at once; step-through controls (L11) still work.
5. Nothing delays interaction: a page's primary action is clickable within 500 ms of navigation.
6. No layout shift from motion: cumulative layout shift under 0.1 per route change, measured in the browser.
7. No continuous loops: no pulsing, shimmer only on loading skeletons, no motion on idle screens.

Primitives (L10 T2), one file, `src/components/motion.tsx` (new): `useReducedMotion`, `Reveal`, `Stagger`, `AnimatedNumber`.

## 5. Explainable credit visuals

Contract (L11 T1), served through the repository like every other figure: per model and version, a baseline on the model's output scale (log-odds for the credit classifiers; probability shown only as a labeled conversion of the final value), and per observation the feature values and SHAP contributions. Every record carries `synthetic: true`; the production adapter answers unavailable, as all production paths do today. Fixture: `src/data/explanations.ts` (new), seeded and deterministic, for the two credit models whose features already exist in `src/data/models.ts#export const FEATURE_IMPORTANCE`.

- Global importance is derived as mean absolute SHAP over the fixture's observations, so the importance chart and the beeswarm read the same rows; today's hand-set values go.
- The individual waterfall is a bridge: baseline, contributions ordered by size with the tail grouped as "other features", output. It reuses `src/components/charts.tsx#export function Waterfall({ bridge, height = 280 }` and `src/lib/calc.ts#export function reconcileBridge(b: Bridge) {`, so it reconciles by the same rule as every bridge in the product.
- Play, pause, step back, step forward and reset; an `aria-live` line reads each step ("bureau_score 612 lowered the log-odds by 0.42"); increase and decrease differ by sign and icon as well as colour.
- The beeswarm: one row per feature, x is the contribution on a shared scale, y a deterministic jitter, colour the feature value's quantile with a persistent legend; points travel once from zero to their place (placed at once under reduced motion); the table alternative lists every point.
- Wording, enforced by `src/test/honest-copy.test.ts`: contributions describe the model's behaviour, not causes; the output is decision support, not a credit decision; the synthetic label stays on screen and in exports.
- Home: the model detail page's explainability tab, which already shows an honest empty state for models without explanations (`src/routes/models.$id.tsx#stateNote="Explainability evidence is not available for this model type."`), ordered as a journey: inputs and data quality, prediction, global importance, beeswarm, case waterfall, review.

## 6. Browser proof

- Runner: Playwright from `e2e/` with `playwright.config.ts` (new), started by an `e2e` npm script, against `vite dev` on a fixed port, Chrome channel.
- Sweep (L9 T2): every page route from the route files, at 1440×900, 1280×800, 1024×768, 768×1024, 390×844 and 360×800: HTTP 200, one h1, no page error, no console error, horizontal overflow 0 px.
- Visual regression: `toHaveScreenshot` at 1440 and 390 per route with `reducedMotion: "reduce"` and the fixed demo date (`src/lib/definitions.ts#export const DEMO_DATE = "2026-01-14";`); a snapshot changes only in a task whose intent is that visual change, and its Journal names the routes.
- Motion is tested separately with motion on: final values, CLS, interaction within 500 ms, long tasks during transitions.
- Synchronize on visible states and roles, never on fixed sleeps.
- The e2e command joins `npm run gate` only when gate plus e2e fits the tool timeout. Measured in L9 T2: gate 97 s plus sweep 2.7 min, 215 s together, under the 600 s cap, so it joined the gate there.

## Phase 9 --- Craft: art direction, browser proof and premium surfaces

Exit gate: one art direction chosen by the human and applied through tokens; the Playwright sweep green at six widths; the Executive Overview rebuilt as the benchmark with 4 to 6 decision KPIs (today: `docs/audit/VISUAL_BASELINE.md#8 KPI tiles where the roadmap asks for 4 to 6`); registers where identifiers no longer wrap (`docs/audit/VISUAL_BASELINE.md#Identifiers wrap mid-token`); every module page in the same rhythm. Loop: L9, ledger `docs/loops/L9_CRAFT.md`.

## Phase 10 --- Motion: tokens, primitives and choreography

Exit gate: motion comes only from tokens; the four primitives exist with tests; charts, navigation, KPIs, tables and drawers move by section 4's rules; F39 fixed; motion budgets measured in the browser. Loop: L10, ledger `docs/loops/L10_MOTION.md`.

## Phase 11 --- Explain: reconciling, animated model explanations

Exit gate: the explanation contract and fixture are in the repository behind the demo adapter; importance, beeswarm and waterfall render from the same rows; every waterfall reconciles; the journey reads in order with honest states; the human has played a case end to end. Loop: L11, ledger `docs/loops/L11_EXPLAIN.md`.

## 7. Human decision queue

The driver halts at each; answering early keeps it moving.

1. L9 T1: approve `@playwright/test` as a dev dependency (recommended; it also settles L8 T2).
2. L9 T4: pick one of three directions, keep or change the font, and allow or refuse OpenDesign and UI UX Pro Max exploration.
3. L9 T10, L10 T9, L11 T7: signoffs at 1440 px and 390 px, keyboard-only, with and without reduced motion.
4. Any request for the Motion package or axe: a new dependency, by I7.

## 8. Out of scope

Backend, identity and evidence policy (L3, L4); real model scores or real customers; changing a figure to make it look better; animation on a page whose numbers are not computed; decorative 3D, neon, glass, scanning effects, idle pulsing.
