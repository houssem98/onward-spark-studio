# L12 Unslop

The human's fixes from the unslop audit of 2026-11-05 (the unslop skill by Damir Sokolovsky, CC BY 4.0, installed in the user's Claude skills, not in this repo). Needs L11. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`; driver `BANKINTELLI_DESIGN_LOOP.md`.

Target: polish inside the signed direction (`docs/design/ART_DIRECTION.md#**A, Institutional Intelligence**`), not a new one. The audit found light slop, so unslop's polish mode applies: keep palette, type, layout and motion; fix only the four findings below.

Deciding rule, fixed before T1 starts: T0 to T4 are ticked, `npm run gate` exits 0, and the human's signoff line (T5), naming the routes walked at 1440 px and 390 px, is in the Journal.

## Current state (read 2026-11-05)

- Clean against the audit: no hue gradients, glows, emoji, looping pulses, `transition-all`, hover scaling, 700 to 900 weights or hype copy in the app's own components.
- Uppercase tracked labels in six places: the eyebrow utility (`src/styles.css#@utility eyebrow {`), the sidebar section labels (`src/components/AppShell.tsx#uppercase tracking-[0.12em] text-ink-muted`), the evidence badge (`src/components/kit.tsx#font-semibold uppercase leading-none tracking-wide`), the synthetic badge (`src/components/kit.tsx#font-medium uppercase tracking-wider text-muted-foreground`), the register table heads (`src/lib/register.ts#font-semibold uppercase tracking-wider text-muted-foreground`) and the lineage node labels (`src/routes/data.tsx#style={{ textTransform: "uppercase", letterSpacing: 1 }}`).
- KPI tiles carry sparklines (`src/components/kit.tsx#data-sparkline`), kept through L9 although the art direction bans decorative ones (`docs/design/ART_DIRECTION.md#no decorative sparklines`), and a browser check holds them inside their tiles (`e2e/bands.spec.ts#hold their sparklines at`). The human chose numbers-only tiles on 2026-11-05.
- The top bar is translucent and blurred (`src/components/AppShell.tsx#bg-card/95 px-4 backdrop-blur md:px-6`); the mobile navigation sheet is 270 px wide, off the 4 px grid (`src/components/AppShell.tsx#className="flex w-[270px] flex-col`).

## Tasks

- [ ] T0 Re-verify. needs: none. Re-read the Current state after L11; capture the shell, overview, credit, models and data at 1440 and 390 and go through the unslop signs list on what renders, adding any sign the code audit missed as a line here, not as a change. Evidence: graph-lint exits 0.
- [ ] T1 Sentence-case labels. needs: T0. The six labels lose uppercase and wide tracking and keep their size; weight 500 at most, 600 only where a label is the one emphasis in its group. Evidence: a browser check quoted failing first: on every route at 1440 and 390, no visible element under 16 px has computed `text-transform: uppercase` or letter-spacing above 0.02em; the existing accessibility and contrast suites still pass.
- [ ] T2 Numbers-only KPI tiles. needs: T0. Each KPI tile shows its label, its figure and its change against a named comparison, and nothing drawn. Replacing the sparkline-containment check in `e2e/bands.spec.ts` with a check at least as strict is an escalation: the human approves it before the change. Evidence: tests: no KPI tile contains an svg; every tile's change names what it compares to; the bands spec still holds every tile to one row height and one baseline.
- [ ] T3 Solid header, grid sizes. needs: T0. The top bar is the opaque card surface with a hairline and no blur; the mobile sheet moves to 272 px. Evidence: tests: the header's computed backdrop-filter is none and its background alpha is 1; the sheet is 272 px wide; the navigation layout-shift checks stay at 0.
- [ ] T4 Independent check. needs: T1, T2, T3. Council per `docs/LOOP_CONVENTIONS.md#Council protocol` with the design, accessibility and numbers attacks plus the unslop checklist as holdout. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T5 (human) Signoff. needs: T4. The human walks the overview, credit, models and data at 1440 px and 390 px. Evidence: the signoff line naming the routes walked.

## Journal
