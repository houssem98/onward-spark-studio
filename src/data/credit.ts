// Synthetic credit portfolio slices for Northstar Bank, FY2025. Balances in USD M (stock), flows in USD M (annual).
export const SEGMENTS = ["Consumer", "SME", "Corporate"] as const;
export const REGIONS = ["North", "Central", "West", "South"] as const;
export const RISK_BANDS = ["A", "B", "C", "D"] as const;
export const CHANNELS = ["Branch", "Digital", "Broker", "Relationship"] as const;

export const PRODUCTS: Record<(typeof SEGMENTS)[number], string[]> = {
  Consumer: ["Personal loan", "Credit card", "Auto loan"],
  SME: ["Term loan", "Working capital line"],
  Corporate: ["Syndicated loan", "Revolving facility"],
};

export const INDUSTRIES = [
  "Retail trade",
  "Manufacturing",
  "Construction",
  "Healthcare",
  "Technology",
  "Agriculture",
  "Households",
];

export interface Slice {
  id: string;
  segment: (typeof SEGMENTS)[number];
  product: string;
  region: (typeof REGIONS)[number];
  riskBand: (typeof RISK_BANDS)[number];
  channel: (typeof CHANNELS)[number];
  industry: string;
  balance: number;
  priorBalance: number;
  originations: number;
  revenue: number;
  npl: number; // balance that is non-performing
  ecl: number; // expected credit loss (model output)
  writeOffs: number;
  recoveries: number;
  dpd30: number;
  limit: number;
  collateral: number;
  loans: number;
}

function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const TOTAL_BALANCE = 16_820;
const TOTAL_REVENUE = 120;

const raw: Omit<Slice, "balance" | "revenue">[] & { w: number; y: number }[] = [] as never;
let k = 0;
for (const segment of SEGMENTS) {
  for (const product of PRODUCTS[segment]) {
    for (const region of REGIONS) {
      k++;
      const r = seeded(k);
      const band = RISK_BANDS[Math.floor(seeded(k + 100) * 4)]!;
      const segW = segment === "Corporate" ? 1.6 : segment === "SME" ? 1.1 : 0.8;
      const yieldW = segment === "Consumer" ? 1.5 : segment === "SME" ? 1.0 : 0.55;
      const bandRisk = { A: 0.006, B: 0.015, C: 0.035, D: 0.07 }[band];
      const ind = segment === "Consumer" ? "Households" : INDUSTRIES[Math.floor(seeded(k + 7) * 6)];
      const ch =
        segment === "Corporate" ? "Relationship" : CHANNELS[Math.floor(seeded(k + 11) * 3)];
      (raw as unknown as Record<string, unknown>[]).push({
        id: `SL-${String(k).padStart(3, "0")}`,
        segment,
        product,
        region,
        riskBand: band,
        channel: ch,
        industry: ind,
        w: segW * (0.6 + r),
        y: yieldW * (0.8 + seeded(k + 3) * 0.4),
        bandRisk,
      });
    }
  }
}

const rw = raw as unknown as { w: number; y: number; bandRisk: number }[];
const sumW = rw.reduce((a, s) => a + s.w, 0);
const sumY = rw.reduce((a, s) => a + s.w * s.y, 0);

export const SLICES: Slice[] = (
  raw as unknown as (Slice & { w: number; y: number; bandRisk: number })[]
).map((s, i) => {
  const balance = (TOTAL_BALANCE * s.w) / sumW;
  const revenue = (TOTAL_REVENUE * s.w * s.y) / sumY;
  const growth = 0.02 + seeded(i + 50) * 0.08;
  return {
    id: s.id,
    segment: s.segment,
    product: s.product,
    region: s.region,
    riskBand: s.riskBand,
    channel: s.channel,
    industry: s.industry,
    balance,
    revenue,
    priorBalance: balance / (1 + growth),
    originations: balance * (s.segment === "Consumer" ? 0.42 : 0.24) * (0.8 + seeded(i + 9) * 0.4),
    npl: balance * s.bandRisk * 1.4,
    ecl: balance * s.bandRisk * 0.55,
    writeOffs: balance * s.bandRisk * 0.3,
    recoveries: balance * s.bandRisk * 0.08,
    dpd30: balance * s.bandRisk * 2.1,
    limit: balance * (s.segment === "Consumer" ? 1.6 : 1.3),
    collateral: balance * (s.segment === "Consumer" ? 0.35 : s.segment === "SME" ? 0.9 : 1.15),
    loans: Math.round(balance * (s.segment === "Consumer" ? 52 : s.segment === "SME" ? 3.1 : 0.12)),
  };
});

export const FUNNEL = [
  { stage: "Application", count: 48_200, days: 0 },
  { stage: "Eligibility", count: 39_100, days: 0.2 },
  { stage: "Underwriting", count: 31_600, days: 1.8 },
  { stage: "Approval", count: 22_400, days: 2.6 },
  { stage: "Offer", count: 21_900, days: 0.4 },
  { stage: "Acceptance", count: 17_300, days: 3.1 },
  { stage: "Disbursement", count: 16_800, days: 1.2 },
  { stage: "Repayment (current)", count: 16_150, days: 0 },
];

export const REJECTION_REASONS = [
  { reason: "Affordability (DTI)", share: 38 },
  { reason: "Bureau score", share: 27 },
  { reason: "Incomplete documents", share: 18 },
  { reason: "Policy exclusion", share: 11 },
  { reason: "Fraud check", share: 6 },
];

export const STRESS = [
  { scenario: "Baseline", eclMultiplier: 1, nplShift: 0 },
  { scenario: "Mild recession", eclMultiplier: 1.45, nplShift: 0.8 },
  { scenario: "Severe recession", eclMultiplier: 2.3, nplShift: 2.1 },
  { scenario: "Rate shock +300bp", eclMultiplier: 1.7, nplShift: 1.2 },
];

export const CREDIT_TREND = [
  { q: "Q1-24", revenue: 27.7, nim: 3.12, npl: 2.1 },
  { q: "Q2-24", revenue: 28.3, nim: 3.1, npl: 2.1 },
  { q: "Q3-24", revenue: 28.7, nim: 3.08, npl: 2.2 },
  { q: "Q4-24", revenue: 29.3, nim: 3.07, npl: 2.2 },
  { q: "Q1-25", revenue: 28.8, nim: 3.05, npl: 2.3 },
  { q: "Q2-25", revenue: 29.5, nim: 3.04, npl: 2.4 },
  { q: "Q3-25", revenue: 30.5, nim: 3.03, npl: 2.4 },
  { q: "Q4-25", revenue: 31.2, nim: 3.02, npl: 2.5 },
];
