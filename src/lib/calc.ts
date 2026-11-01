// Deterministic financial arithmetic. All AI narrative must reference values produced here.

export const round = (v: number, dp = 1) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const pct = (num: number, den: number) => (den === 0 ? 0 : (num / den) * 100);

export const growth = (current: number, prior: number) => (prior === 0 ? 0 : ((current - prior) / prior) * 100);

export const costToIncome = (opex: number, income: number) => pct(opex, income);

export interface BridgeStep {
  label: string;
  value: number;
  kind: "measured" | "residual";
}

export interface Bridge {
  id: string;
  method: string;
  baseLabel: string;
  base: number;
  actualLabel: string;
  actual: number;
  steps: BridgeStep[];
}

/** Returns gap, explained total and whether the steps reconcile exactly to the gap. */
export function reconcileBridge(b: Bridge) {
  const gap = round(b.actual - b.base, 4);
  const explained = round(sum(b.steps.map((s) => s.value)), 4);
  return { gap, explained, difference: round(gap - explained, 4), reconciles: Math.abs(gap - explained) < 1e-6 };
}

/** Waterfall rows for charting: invisible offset + visible bar. */
export function waterfallRows(b: Bridge) {
  const rows: { name: string; offset: number; value: number; signed: number; type: "total" | "up" | "down" | "residual" }[] = [];
  rows.push({ name: b.baseLabel, offset: 0, value: b.base, signed: b.base, type: "total" });
  let running = b.base;
  for (const s of b.steps) {
    const next = running + s.value;
    rows.push({
      name: s.label,
      offset: Math.min(running, next),
      value: Math.abs(s.value),
      signed: s.value,
      type: s.kind === "residual" ? "residual" : s.value >= 0 ? "up" : "down",
    });
    running = next;
  }
  rows.push({ name: b.actualLabel, offset: 0, value: b.actual, signed: b.actual, type: "total" });
  return rows;
}

/** Population Stability Index across matching bins. */
export function psi(expected: number[], actual: number[]) {
  let total = 0;
  for (let i = 0; i < expected.length; i++) {
    const e = Math.max(expected[i], 1e-6);
    const a = Math.max(actual[i], 1e-6);
    total += (a - e) * Math.log(a / e);
  }
  return total;
}

export const psiBand = (v: number) => (v < 0.1 ? "Stable" : v < 0.25 ? "Moderate shift" : "Significant shift");

export function classificationMetrics(tp: number, fp: number, fn: number, tn: number) {
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  const f1 = (2 * precision * recall) / (precision + recall);
  const accuracy = (tp + tn) / (tp + fp + fn + tn);
  return { precision, recall, f1, accuracy };
}

export const fmtM = (v: number, dp = 1) => `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}M`;
export const fmtPct = (v: number, dp = 1) => `${v.toFixed(dp)}%`;
export const fmtNum = (v: number) => v.toLocaleString("en-US");
export const fmtSigned = (v: number, dp = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(dp)}`;

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export function downloadFile(name: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
