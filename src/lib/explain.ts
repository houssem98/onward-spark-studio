import type { FeatureImportance, ModelExplanation } from "@/repo/types";

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
