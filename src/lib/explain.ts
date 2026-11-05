import type { Bridge } from "@/lib/calc";
import type { ExplainedObservation, FeatureImportance, ModelExplanation } from "@/repo/types";

const r4 = (v: number) => Math.round(v * 10_000) / 10_000;
// Signed as the charts and tables sign it, so a figure reads the same everywhere.
const f4 = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(4)}`;
const probability = (logOdds: number) => `${(100 / (1 + Math.exp(-logOdds))).toFixed(1)}%`;

export const CASE_CAVEAT =
  "Contributions describe how the model scored this case, not causes. The output is decision support, not a credit decision.";

const MAX_STEPS = 6;

/** One case as a bridge from the baseline to the output: contributions largest first, any past the
 *  sixth step grouped as "other features", so a case reconciles by the rule every bridge follows. */
export function caseBridge(e: ModelExplanation, o: ExplainedObservation): Bridge {
  const ranked = [...e.features].sort(
    (a, b) => Math.abs(o.contributions[b]!) - Math.abs(o.contributions[a]!),
  );
  const head = ranked.length > MAX_STEPS ? ranked.slice(0, MAX_STEPS - 1) : ranked;
  const tail = ranked.slice(head.length);
  const steps: Bridge["steps"] = head.map((f) => ({
    label: f,
    value: o.contributions[f]!,
    kind: "measured",
  }));
  if (tail.length)
    steps.push({
      label: `other features (${tail.length})`,
      value: r4(tail.reduce((s, f) => s + o.contributions[f]!, 0)),
      kind: "measured",
    });
  return {
    id: `${e.model}-${o.id}`,
    method: "SHAP",
    period: `${e.model} ${e.version}`,
    baseLabel: "Baseline",
    base: e.baseline,
    actualLabel: "Output",
    actual: o.output,
    steps,
  };
}

/** The log-odds after the first n steps of a case. */
export const cumulativeAt = (b: Bridge, n: number) =>
  r4(b.base + b.steps.slice(0, n).reduce((s, x) => s + x.value, 0));

/** What step n of a case reads aloud: the feature, its value and how it moved the log-odds. */
export function stepLine(b: Bridge, o: ExplainedObservation, n: number) {
  if (n === 0)
    return `Baseline log-odds ${f4(b.base)}, a ${probability(b.base)} probability of default`;
  const s = b.steps[n - 1]!;
  const value = o.values[s.label];
  const name = `${s.label}${value === undefined ? "" : ` ${value}`}`;
  const line =
    s.value === 0
      ? `${name} left the log-odds unchanged at ${f4(cumulativeAt(b, n))}`
      : `${name} ${s.value > 0 ? "raised" : "lowered"} the log-odds by ${Math.abs(s.value).toFixed(4)} to ${f4(cumulativeAt(b, n))}`;
  return n === b.steps.length
    ? `${line}. Output log-odds ${f4(b.actual)}, a ${probability(b.actual)} probability of default`
    : line;
}

/** Global importance: each feature's mean absolute SHAP over the explained observations, at 4 dp,
 *  largest first, so the importance chart and the beeswarm read the same rows. */
export function globalImportance(e: ModelExplanation): FeatureImportance[] {
  return e.features
    .map((feature) => ({
      feature,
      value:
        Math.round(
          (e.observations.reduce((s, o) => s + Math.abs(o.contributions[feature]!), 0) /
            e.observations.length) *
            10_000,
        ) / 10_000,
    }))
    .sort((a, b) => b.value - a.value);
}
