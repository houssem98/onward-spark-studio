// Deterministic financial arithmetic. All AI narrative must reference values produced here.
// A value with a zero denominator is unavailable: null, never 0 or NaN.

import { repo } from "@/repo/queries";

export const UNAVAILABLE = "Unavailable";

// Half away from zero; toPrecision(15) drops binary noise, so 1.005 rounds to 1.01.
export function round(v: number, dp?: number): number;
export function round(v: number | null, dp?: number): number | null;
export function round(v: number | null, dp = 1) {
  if (v === null) return null;
  const n = Math.round(Number((Math.abs(v) * 10 ** dp).toPrecision(15)));
  return n === 0 ? 0 : (Math.sign(v) * n) / 10 ** dp;
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);

export const pct = (num: number, den: number) => (den === 0 ? null : (num / den) * 100);

export const growth = (current: number, prior: number) =>
  prior === 0 ? null : ((current - prior) / prior) * 100;

export const costToIncome = (opex: number, income: number) => pct(opex, income);

export const diff = (a: number | null, b: number | null) =>
  a === null || b === null ? null : a - b;

export interface BridgeStep {
  label: string;
  value: number;
  kind: "measured" | "residual";
}

export interface Bridge {
  id: string;
  method: string;
  period: string;
  baseLabel: string;
  base: number;
  actualLabel: string;
  actual: number;
  steps: BridgeStep[];
}

/** Gap, explained total, and whether the steps reconcile to the gap at 4 dp. */
export function reconcileBridge(b: Bridge) {
  const explained = sum(b.steps.map((s) => s.value));
  // Rounding the difference once; rounding each total first can invent or hide 0.0001.
  const difference = round(b.actual - b.base - explained, 4);
  return {
    gap: round(b.actual - b.base, 4),
    explained: round(explained, 4),
    difference,
    reconciles: difference === 0,
  };
}

/** Waterfall rows for charting: invisible offset + visible bar. */
export function waterfallRows(b: Bridge) {
  const rows: {
    name: string;
    offset: number;
    value: number;
    signed: number;
    type: "total" | "up" | "down" | "residual";
  }[] = [];
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
  if (expected.length !== actual.length) throw new Error("psi: bin counts differ");
  let total = 0;
  for (let i = 0; i < expected.length; i++) {
    const e = Math.max(expected[i]!, 1e-6);
    const a = Math.max(actual[i]!, 1e-6);
    total += (a - e) * Math.log(a / e);
  }
  return total;
}

export const psiBand = (v: number) =>
  v < 0.1 ? "Stable" : v < 0.25 ? "Moderate shift" : "Significant shift";

export function classificationMetrics(tp: number, fp: number, fn: number, tn: number) {
  const ratio = (num: number, den: number) => (den === 0 ? null : num / den);
  return {
    precision: ratio(tp, tp + fp),
    recall: ratio(tp, tp + fn),
    // 2PR / (P + R) over the counts, so no true positives scores 0 instead of 0/0.
    f1: ratio(2 * tp, 2 * tp + fp + fn),
    accuracy: ratio(tp + tn, tp + fp + fn + tn),
  };
}

export const fmtM = (v: number, dp = 1) =>
  `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}M`;
export const fmtFixed = (v: number | null, dp = 1, unit = "") =>
  v === null ? UNAVAILABLE : `${v.toFixed(dp)}${unit}`;
export const fmtPct = (v: number | null, dp = 1) => fmtFixed(v, dp, "%");
export const fmtNum = (v: number) => v.toLocaleString("en-US");
export const fmtSigned = (v: number, dp = 1) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(dp)}`;

export function toCSV(rows: Record<string, unknown>[]) {
  const [first] = rows;
  if (!first) return "";
  const keys = Object.keys(first);
  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    // Text that starts like a formula stays text in a spreadsheet; a number stays a number.
    if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.map(esc).join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join(
    "\n",
  );
}

export const exportNotice = () =>
  repo.environment === "demo"
    ? "Demo environment · synthetic data: every figure belongs to the fictional Northstar Bank."
    : "Production environment";

// Every downloaded file states its environment on its first line.
export function downloadFile(name: string, content: string, type = "text/csv") {
  const notice = type === "text/markdown" ? `> ${exportNotice()}\n` : exportNotice();
  const blob = new Blob([`${notice}\n${content}`], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
