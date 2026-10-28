import type { Bridge } from "@/lib/calc";

export const BANK = { name: "Northstar Bank", short: "Northstar", currency: "USD", unit: "millions", basis: "IFRS (synthetic)" };
export const PERIODS = ["FY2025", "FY2024"] as const;
export const QUARTERS = ["Q1-24", "Q2-24", "Q3-24", "Q4-24", "Q1-25", "Q2-25", "Q3-25", "Q4-25"];

export interface Department {
  id: string;
  name: string;
  revenue: number; // FY2025 operating income, USD M
  prior: number; // FY2024
  target: number; // FY2025 budget
  expenses: number; // FY2025
  priorExpenses: number;
  owner: string;
  costCenter?: boolean;
}

export const DEPARTMENTS: Department[] = [
  { id: "retail", name: "Retail Banking", revenue: 412, prior: 395, target: 430, expenses: 248, priorExpenses: 236, owner: "M. Okafor" },
  { id: "corporate", name: "Corporate Banking", revenue: 286, prior: 262, target: 280, expenses: 142, priorExpenses: 138, owner: "L. Brandt" },
  { id: "credit", name: "Credit", revenue: 120, prior: 114, target: 138, expenses: 58, priorExpenses: 54, owner: "A. Haddad" },
  { id: "payments", name: "Payments", revenue: 98, prior: 88, target: 95, expenses: 61, priorExpenses: 57, owner: "R. Castillo" },
  { id: "treasury", name: "Treasury", revenue: 74, prior: 69, target: 70, expenses: 22, priorExpenses: 21, owner: "J. Lindqvist" },
  { id: "wealth", name: "Wealth Management", revenue: 66, prior: 63, target: 72, expenses: 41, priorExpenses: 38, owner: "P. Nair" },
  { id: "trade", name: "Trade Finance", revenue: 38, prior: 35, target: 40, expenses: 19, priorExpenses: 18, owner: "K. Mensah" },
  { id: "fincrime", name: "Fraud & Financial Crime Ops", revenue: 0, prior: 0, target: 0, expenses: 34, priorExpenses: 29, owner: "S. Whitfield", costCenter: true },
  { id: "finops", name: "Finance & Operations", revenue: 0, prior: 0, target: 0, expenses: 118, priorExpenses: 115, owner: "D. Moreau", costCenter: true },
];

// Quarterly phasing (sums to 1 per year) used to derive quarterly series deterministically.
const PHASE_24 = [0.243, 0.248, 0.252, 0.257];
const PHASE_25 = [0.24, 0.246, 0.254, 0.26];

export function quarterlyRevenue() {
  return QUARTERS.map((q, i) => {
    const y25 = i >= 4;
    const ph = (y25 ? PHASE_25[i - 4] : PHASE_24[i])!;
    const row: Record<string, number | string> = { quarter: q };
    let total = 0;
    let exp = 0;
    for (const d of DEPARTMENTS) {
      const v = (y25 ? d.revenue : d.prior) * ph;
      row[d.id] = Math.round(v * 10) / 10;
      total += v;
      exp += (y25 ? d.expenses : d.priorExpenses) * ph;
    }
    row["total"] = Math.round(total * 10) / 10;
    row["expenses"] = Math.round(exp * 10) / 10;
    row["profit"] = Math.round((total - exp) * 10) / 10;
    return row;
  });
}

// Balance-sheet & ratio scorecard (synthetic). NII + non-interest income = total operating income.
export const SCORECARD = {
  FY2025: { nii: 742, nonInterest: 352, avgEarningAssets: 24_150, netIncome: 268, avgAssets: 27_400, avgEquity: 2_310, loans: 16_820, priorLoans: 15_960, deposits: 21_480, priorDeposits: 20_610 },
  FY2024: { nii: 711, nonInterest: 315, avgEarningAssets: 22_980, netIncome: 241, avgAssets: 26_100, avgEquity: 2_190, loans: 15_960, priorLoans: 15_200, deposits: 20_610, priorDeposits: 19_940 },
};

export type SourceType = "PUBLIC_DISCLOSURE" | "LICENSED" | "INTERNAL" | "NOT_AVAILABLE";

export interface Peer {
  id: string;
  name: string;
  region: string;
  assets: number;
  nim: number | null;
  cir: number | null;
  roe: number | null;
  roa: number | null;
  creditGrowth: number | null;
  depositGrowth: number | null;
  creditRevenue: number | null;
  source: SourceType;
  period: string;
  comparability: "High" | "Medium" | "Low";
  warning?: string;
}

export const PEERS: Peer[] = [
  { id: "harborline", name: "Harborline Financial", region: "North", assets: 29_800, nim: 3.31, cir: 61.2, roe: 12.8, roa: 1.08, creditGrowth: 9.4, depositGrowth: 5.1, creditRevenue: 152, source: "PUBLIC_DISCLOSURE", period: "FY2025", comparability: "High" },
  { id: "meridian", name: "Meridian Trust Bank", region: "Central", assets: 24_600, nim: 3.18, cir: 63.9, roe: 11.6, roa: 0.97, creditGrowth: 7.8, depositGrowth: 3.9, creditRevenue: 146, source: "PUBLIC_DISCLOSURE", period: "FY2025", comparability: "High" },
  { id: "cascade", name: "Cascade Federal", region: "West", assets: 31_200, nim: 2.94, cir: 66.4, roe: 10.1, roa: 0.88, creditGrowth: 6.2, depositGrowth: 4.4, creditRevenue: 151, source: "LICENSED", period: "FY2025", comparability: "Medium", warning: "Credit revenue includes leasing income not reported separately by Northstar." },
  { id: "ironwood", name: "Ironwood Bancorp", region: "South", assets: 22_900, nim: 3.42, cir: 59.8, roe: 13.4, roa: 1.12, creditGrowth: null, depositGrowth: 6.0, creditRevenue: null, source: "PUBLIC_DISCLOSURE", period: "FY2025 (9M annualized)", comparability: "Low", warning: "Only 9-month figures disclosed; annualized values are not directly comparable." },
  { id: "solent", name: "Solent Commercial", region: "North", assets: 26_300, nim: null, cir: null, roe: null, roa: null, creditGrowth: null, depositGrowth: null, creditRevenue: null, source: "NOT_AVAILABLE", period: "—", comparability: "Low", warning: "Private institution — no permitted source for financial metrics." },
];

export const PEER_HISTORY = [
  { year: "FY2021", northstar: 2.86, harborline: 3.02, meridian: 2.95, cascade: 2.71 },
  { year: "FY2022", northstar: 2.94, harborline: 3.11, meridian: 3.02, cascade: 2.8 },
  { year: "FY2023", northstar: 3.05, harborline: 3.24, meridian: 3.1, cascade: 2.88 },
  { year: "FY2024", northstar: 3.09, harborline: 3.28, meridian: 3.15, cascade: 2.91 },
  { year: "FY2025", northstar: 3.07, harborline: 3.31, meridian: 3.18, cascade: 2.94 },
];

// Credit revenue bridges (USD M, synthetic). Each must reconcile exactly — see calc.test.ts.
export const BRIDGES: Bridge[] = [
  {
    id: "peer",
    method: "Actual vs peer benchmark (volume / price / mix)",
    baseLabel: "Peer benchmark",
    base: 150,
    actualLabel: "Northstar actual",
    actual: 120,
    steps: [
      { label: "Volume", value: -18, kind: "measured" },
      { label: "Pricing", value: -7, kind: "measured" },
      { label: "Product mix", value: -3, kind: "measured" },
      { label: "Other / unexplained", value: -2, kind: "residual" },
    ],
  },
  {
    id: "budget",
    method: "Actual vs budget variance",
    baseLabel: "FY2025 budget",
    base: 138,
    actualLabel: "FY2025 actual",
    actual: 120,
    steps: [
      { label: "Volume", value: -10, kind: "measured" },
      { label: "Pricing", value: -5, kind: "measured" },
      { label: "Fee waivers", value: -1.5, kind: "measured" },
      { label: "Other / unexplained", value: -1.5, kind: "residual" },
    ],
  },
  {
    id: "prior",
    method: "Actual vs prior period variance",
    baseLabel: "FY2024 actual",
    base: 114,
    actualLabel: "FY2025 actual",
    actual: 120,
    steps: [
      { label: "Volume", value: 9, kind: "measured" },
      { label: "Pricing", value: -2, kind: "measured" },
      { label: "Product mix", value: -0.5, kind: "measured" },
      { label: "Other / unexplained", value: -0.5, kind: "residual" },
    ],
  },
];

export const PEER_BENCHMARK_NOTE =
  "Peer benchmark = mean credit revenue of high-comparability peers (Harborline 152, Meridian 146, Cascade 151 → 149.7, rounded to 150 for illustration). Cascade carries a comparability warning.";
