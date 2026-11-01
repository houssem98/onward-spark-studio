# L11 Explain

Phase 11 of `docs/roadmap/DESIGN_MOTION_ROADMAP.md`, "Explain: reconciling, animated model explanations". Needs L10. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`; driver `BANKINTELLI_DESIGN_LOOP.md`.

Target: `docs/roadmap/DESIGN_MOTION_ROADMAP.md#every waterfall reconciles; the journey reads in order with honest states;`

Deciding rule, fixed before T1 starts: T0 to T6 are ticked, `npm run gate` exits 0, `npm run e2e` exits 0, and the human's signoff line (T7), naming the model and case played end to end, is in the Journal.

## Current state (read 2026-11-01; T0 re-verifies)

- Explanations are global only and hand-set: mean absolute SHAP per feature for some models (`src/data/models.ts#export const FEATURE_IMPORTANCE`), typed through the repository (`src/repo/types.ts#featureImportance: typeof models.FEATURE_IMPORTANCE;`).
- The model page's explainability tab draws them in a frame and shows an honest empty state otherwise (`src/routes/models.$id.tsx#stateNote="Explainability evidence is not available for this model type."`).
- A reconciling bridge and its chart already exist (`src/lib/calc.ts#export function reconcileBridge(b: Bridge) {`, `src/components/charts.tsx#export function Waterfall({ bridge, height = 280 }`).

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L9 and L10 changed. Evidence: graph-lint exits 0.
- [ ] T1 Contract and fixture. needs: T0. The explanation contract of `docs/roadmap/DESIGN_MOTION_ROADMAP.md#Contract (L11 T1)` in `src/repo/types.ts`; `src/data/explanations.ts` (new), seeded and deterministic, for the two credit models, served by the demo adapter only; the production adapter answers unavailable. Global importance becomes mean absolute SHAP over the fixture's observations, replacing the hand-set values. Evidence: tests quoted failing first: baseline plus contributions equals the output at 4 dp for every case and observation; every record has `synthetic: true`; importance equals the mean absolute contribution; the production adapter returns unavailable.
- [ ] T2 Importance. needs: T1. Ranked bars grow from zero to their value; hovering or focusing a bar highlights its row in the table alternative; activating it opens the feature's definition. Evidence: tests: final bar values equal the repository's; keyboard focus reaches every bar and opens its definition.
- [ ] T3 Case waterfall. needs: T1. A case selector and the waterfall of `docs/roadmap/DESIGN_MOTION_ROADMAP.md#The individual waterfall is a bridge`: play, pause, step back, step forward, reset, an `aria-live` step line, sign and icon as well as colour; under reduced motion the final state shows at once and the step controls still work; the caveat says contributions describe the model, not causes, and the output is decision support. Evidence: tests: after step n the cumulative value equals the baseline plus the first n contributions; reset returns to the baseline; the final step equals the output; `src/test/honest-copy.test.ts` grows to ban causal wording in explanation copy; Playwright plays a case to the end and reads the final label.
- [ ] T4 Beeswarm. needs: T1. The beeswarm of `docs/roadmap/DESIGN_MOTION_ROADMAP.md#The beeswarm: one row per feature` inside a `ChartFrame`, with a legend, a feature filter and a reset; points travel once and are placed at once under reduced motion. Evidence: tests: every point's x maps back to its contribution within half a pixel; the table alternative has one row per observation; selecting a feature hides the other rows and reset restores them.
- [ ] T5 Journey. needs: T2, T3, T4. The explainability tab reads in the journey order of `docs/roadmap/DESIGN_MOTION_ROADMAP.md#ordered as a journey`, each stage with distinct loading, complete, unavailable and failed states; models without explanations keep the honest empty state; the credit page links to its credit model's explanation. Evidence: tests for the stage order and each state; `npm run e2e` exits 0 with the tab open at 1440 and 390.
- [ ] T6 Independent check. needs: T5. Council per `docs/LOOP_CONVENTIONS.md#Council protocol` with the explanation, numbers, synthetic and accessibility attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T7 (human) Signoff. needs: T6. The human picks a credit model and a case, plays the waterfall end to end, steps it by keyboard, and repeats with reduced motion, at 1440 px and 390 px. Evidence: the signoff line naming the model and case.

## Journal
