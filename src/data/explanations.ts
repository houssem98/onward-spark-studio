import type { ExplainedObservation, ModelExplanation } from "@/repo/types";

// Seeded and deterministic SHAP explanations for the two credit classifiers. Synthetic: no real
// applicant or borrower. Contributions are on the log-odds scale and, with the baseline, sum to
// the model output; each feature's contributions average to zero over the sample, as SHAP values
// do over their background data.
export const SOURCE = "Seeded SHAP fixture for the credit classifiers (synthetic)";

const round = (x: number) => Math.round(x * 10_000) / 10_000;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** mulberry32: a small seeded generator, so every run draws the same sample. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Feature {
  name: string;
  draw: (r: () => number) => number;
  /** The quantity the model responds to; the value itself when absent. */
  score?: (value: number) => number;
  /** Signed spread of the contribution on the log-odds scale. */
  weight: number;
}

function explain(
  model: string,
  version: string,
  baseline: number,
  prefix: string,
  seed: number,
  features: Feature[],
  n = 40,
): ModelExplanation {
  const r = seeded(seed);
  const rows = Array.from({ length: n }, () =>
    Object.fromEntries(features.map((f) => [f.name, f.draw(r)])),
  );
  const scale = features.map((f) => {
    const s = rows.map((v) => (f.score ?? ((x) => x))(v[f.name]!));
    const m = mean(s);
    return { m, sd: Math.sqrt(mean(s.map((x) => (x - m) ** 2))) || 1 };
  });
  const observations: ExplainedObservation[] = rows.map((values, i) => {
    const contributions = Object.fromEntries(
      features.map((f, j) => {
        const s = (f.score ?? ((x) => x))(values[f.name]!);
        return [f.name, round((f.weight * (s - scale[j]!.m)) / scale[j]!.sd)];
      }),
    );
    const output = round(baseline + Object.values(contributions).reduce((a, b) => a + b, 0));
    return {
      id: `${prefix}-${String(i + 1).padStart(3, "0")}`,
      values,
      contributions,
      output,
      synthetic: true,
    };
  });
  return {
    model,
    version,
    scale: "log-odds",
    baseline,
    features: features.map((f) => f.name),
    observations,
    source: SOURCE,
    synthetic: true,
  };
}

const SECTOR_RISK: Record<number, number> = { 41: 0.9, 47: 0.6, 56: 1, 62: 0.3, 68: 0.5 };
const SECTORS = Object.keys(SECTOR_RISK).map(Number);

export const EXPLANATIONS: ModelExplanation[] = [
  // Retail PD Scorecard: baseline log-odds of a 10% probability of default.
  explain("MDL-001", "3.2.0", -2.1972, "APP", 1001, [
    { name: "bureau_score", draw: (r) => Math.round(520 + r() * 300), weight: -0.55 },
    { name: "dti_ratio", draw: (r) => Math.round((0.08 + r() * 0.5) * 100) / 100, weight: 0.42 },
    { name: "months_on_book", draw: (r) => Math.round(r() * 120), weight: -0.24 },
    { name: "revolving_util", draw: (r) => Math.round(r() * 100) / 100, weight: 0.2 },
    { name: "income_verified", draw: (r) => (r() < 0.7 ? 1 : 0), weight: -0.13 },
  ]),
  // SME Credit Risk Model: baseline log-odds of a 5% probability of default.
  explain("MDL-002", "2.4.1", -2.9444, "SME", 2002, [
    {
      name: "debt_service_coverage",
      draw: (r) => Math.round((0.6 + r() * 2.4) * 100) / 100,
      weight: -0.5,
    },
    { name: "utilization_rate", draw: (r) => Math.round(r() * 100) / 100, weight: 0.37 },
    {
      name: "sector_code",
      draw: (r) => SECTORS[Math.floor(r() * SECTORS.length)]!,
      score: (code) => SECTOR_RISK[code]!,
      weight: 0.28,
    },
    { name: "years_in_business", draw: (r) => Math.round(1 + r() * 29), weight: -0.22 },
    { name: "revenue_band", draw: (r) => 1 + Math.floor(r() * 5), weight: -0.15 },
  ]),
];
