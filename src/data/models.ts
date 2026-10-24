export type ModelKind = "classification" | "regression" | "forecasting" | "anomaly";
export type Lifecycle = "Production" | "Validation" | "Development" | "Retired" | "Pending Approval";

export interface ModelVersion {
  version: string;
  date: string;
  status: "Active" | "Superseded" | "Candidate";
  note: string;
  metrics: Record<string, number>;
}

export interface ValidationFinding {
  id: string;
  severity: "High" | "Medium" | "Low";
  title: string;
  detail: string;
  status: "Open" | "Remediating" | "Closed";
}

export interface Model {
  id: string;
  name: string;
  businessOwner: string;
  technicalOwner: string;
  department: string;
  purpose: string;
  kind: ModelKind;
  algorithm: string;
  version: string;
  environment: "Production" | "UAT" | "Development";
  lifecycle: Lifecycle;
  lastValidation: string;
  nextReview: string;
  riskTier: "Tier 1" | "Tier 2" | "Tier 3";
  criticality: "Critical" | "High" | "Medium";
  requirements: string[];
  health: "Healthy" | "Watch" | "Alert";
  versions: ModelVersion[];
  findings: ValidationFinding[];
  limitations: string[];
  trainingData: string[];
  ops: { latencyMs: number; failures: number; throughput: number; availability: number };
  confusion?: { tp: number; fp: number; fn: number; tn: number };
}

export const MODELS: Model[] = [
  {
    id: "MDL-001", name: "Retail PD Scorecard", businessOwner: "M. Okafor", technicalOwner: "E. Varga", department: "Retail Banking",
    purpose: "Probability of default for unsecured consumer lending applications.", kind: "classification", algorithm: "Gradient-boosted trees",
    version: "3.2.0", environment: "Production", lifecycle: "Production", lastValidation: "2025-06-12", nextReview: "2026-06-12",
    riskTier: "Tier 1", criticality: "Critical", requirements: ["SR 11-7 aligned policy", "IFRS 9 PD input", "Fair lending review"], health: "Healthy",
    versions: [
      { version: "3.2.0", date: "2025-05-20", status: "Active", note: "Recalibrated on 2024 vintages", metrics: { auc: 0.812, ks: 0.47, brier: 0.071 } },
      { version: "3.1.1", date: "2024-09-02", status: "Superseded", note: "Feature hotfix", metrics: { auc: 0.804, ks: 0.46, brier: 0.074 } },
      { version: "3.3.0-rc1", date: "2025-11-14", status: "Candidate", note: "Adds bureau trend features", metrics: { auc: 0.821, ks: 0.49, brier: 0.069 } },
    ],
    findings: [{ id: "VF-011", severity: "Low", title: "Calibration drift in top risk decile", detail: "Observed default rate 1.4pp above predicted in decile 10.", status: "Remediating" }],
    limitations: ["Not validated for thin-file applicants (<6 months bureau history)."], trainingData: ["DS-006 Credit risk features", "DS-002 Loan portfolio"],
    ops: { latencyMs: 42, failures: 3, throughput: 1840, availability: 99.97 }, confusion: { tp: 812, fp: 1460, fn: 298, tn: 17430 },
  },
  {
    id: "MDL-002", name: "SME Credit Risk Model", businessOwner: "A. Haddad", technicalOwner: "T. Ibrahim", department: "Credit",
    purpose: "Risk grading of SME borrowers at origination and annual review.", kind: "classification", algorithm: "Logistic regression (WoE)",
    version: "2.4.1", environment: "Production", lifecycle: "Production", lastValidation: "2024-11-03", nextReview: "2025-11-03",
    riskTier: "Tier 1", criticality: "Critical", requirements: ["SR 11-7 aligned policy", "IFRS 9 PD input", "Annual independent validation"], health: "Alert",
    versions: [
      { version: "2.4.1", date: "2024-10-15", status: "Active", note: "Approved reference period Jan–Jun 2024", metrics: { auc: 0.763, ks: 0.39, brier: 0.088 } },
      { version: "2.3.0", date: "2023-08-30", status: "Superseded", note: "Previous production release", metrics: { auc: 0.751, ks: 0.37, brier: 0.091 } },
    ],
    findings: [
      { id: "VF-021", severity: "High", title: "Annual validation overdue", detail: "Next review date 2025-11-03 has passed without independent validation sign-off.", status: "Open" },
      { id: "VF-022", severity: "Medium", title: "Sector concentration in development sample", detail: "Construction sector under-represented (3% vs 9% of current book).", status: "Open" },
    ],
    limitations: ["Developed on pre-2024 rate environment.", "Sector coverage limited for construction and agriculture."], trainingData: ["DS-006 Credit risk features", "DS-004 Curated credit dataset"],
    ops: { latencyMs: 18, failures: 0, throughput: 220, availability: 99.99 }, confusion: { tp: 214, fp: 402, fn: 96, tn: 3288 },
  },
  {
    id: "MDL-003", name: "Card Fraud Detection", businessOwner: "S. Whitfield", technicalOwner: "N. Petrov", department: "Fraud & Financial Crime Ops",
    purpose: "Real-time scoring of card authorizations for fraud likelihood.", kind: "classification", algorithm: "Gradient-boosted trees + rules",
    version: "5.0.3", environment: "Production", lifecycle: "Production", lastValidation: "2025-08-21", nextReview: "2026-02-21",
    riskTier: "Tier 2", criticality: "Critical", requirements: ["Operational resilience", "Semi-annual performance review"], health: "Watch",
    versions: [
      { version: "5.0.3", date: "2025-08-01", status: "Active", note: "Threshold tuned to 0.82", metrics: { auc: 0.947, precision: 0.31, recall: 0.78 } },
      { version: "4.9.0", date: "2025-01-12", status: "Superseded", note: "Prior release", metrics: { auc: 0.939, precision: 0.28, recall: 0.76 } },
    ],
    findings: [{ id: "VF-031", severity: "Medium", title: "Precision decline in e-commerce channel", detail: "Precision fell from 0.34 to 0.27 in CNP transactions in Q4.", status: "Open" }],
    limitations: ["Labels lag up to 60 days due to chargeback cycle."], trainingData: ["DS-004 Payments transactions", "DS-007 Fraud alerts"],
    ops: { latencyMs: 9, failures: 12, throughput: 14200, availability: 99.95 }, confusion: { tp: 1560, fp: 3470, fn: 440, tn: 994530 },
  },
  {
    id: "MDL-004", name: "AML Transaction Monitoring", businessOwner: "S. Whitfield", technicalOwner: "C. Duarte", department: "Fraud & Financial Crime Ops",
    purpose: "Scenario-based detection of suspicious activity indicators with ML prioritization.", kind: "anomaly", algorithm: "Rules + isolation forest prioritizer",
    version: "1.8.0", environment: "Production", lifecycle: "Production", lastValidation: "2025-03-10", nextReview: "2026-03-10",
    riskTier: "Tier 1", criticality: "Critical", requirements: ["AML program governance", "Scenario tuning documentation"], health: "Healthy",
    versions: [{ version: "1.8.0", date: "2025-02-18", status: "Active", note: "Added structuring scenario v2", metrics: { alertRate: 0.42, escalationRate: 6.8 } }],
    findings: [{ id: "VF-041", severity: "Low", title: "Below-the-line testing incomplete", detail: "Two of nine scenarios lack BTL sample documentation.", status: "Remediating" }],
    limitations: ["Escalation rate is a proxy; confirmed outcomes are not available for most alerts."], trainingData: ["DS-004 Payments transactions", "DS-008 AML cases"],
    ops: { latencyMs: 0, failures: 1, throughput: 0, availability: 99.9 },
  },
  {
    id: "MDL-005", name: "Revenue Forecast", businessOwner: "D. Moreau", technicalOwner: "H. Kim", department: "Finance & Operations",
    purpose: "Quarterly operating income forecast by business unit.", kind: "forecasting", algorithm: "Hierarchical ARIMAX",
    version: "1.3.0", environment: "Production", lifecycle: "Production", lastValidation: "2025-04-02", nextReview: "2026-04-02",
    riskTier: "Tier 3", criticality: "Medium", requirements: ["Finance model policy"], health: "Healthy",
    versions: [{ version: "1.3.0", date: "2025-03-15", status: "Active", note: "Added rate-path regressors", metrics: { mape: 3.8, bias: -1.1 } }],
    findings: [], limitations: ["Does not model one-off items or M&A."], trainingData: ["DS-001 General ledger", "DS-009 Finance reporting"],
    ops: { latencyMs: 0, failures: 0, throughput: 0, availability: 100 },
  },
  {
    id: "MDL-006", name: "Customer Churn Prediction", businessOwner: "P. Nair", technicalOwner: "E. Varga", department: "Wealth Management",
    purpose: "Identify clients likely to reduce assets under management within 90 days.", kind: "classification", algorithm: "Random forest",
    version: "0.9.2", environment: "UAT", lifecycle: "Pending Approval", lastValidation: "2025-12-01", nextReview: "2026-12-01",
    riskTier: "Tier 3", criticality: "Medium", requirements: ["Model policy — low tier", "Privacy impact assessment"], health: "Healthy",
    versions: [{ version: "0.9.2", date: "2025-11-20", status: "Candidate", note: "Submitted for approval", metrics: { auc: 0.781, precision: 0.44, recall: 0.61 } }],
    findings: [{ id: "VF-061", severity: "Medium", title: "Privacy assessment pending", detail: "PIA not yet signed off by data protection office.", status: "Open" }],
    limitations: ["Excludes clients onboarded <12 months."], trainingData: ["DS-003 Customer master", "DS-005 Deposits and balances"],
    ops: { latencyMs: 120, failures: 0, throughput: 40, availability: 99.5 }, confusion: { tp: 305, fp: 388, fn: 195, tn: 4112 },
  },
  {
    id: "MDL-007", name: "Corporate LGD Model", businessOwner: "L. Brandt", technicalOwner: "T. Ibrahim", department: "Corporate Banking",
    purpose: "Loss-given-default estimation for corporate exposures.", kind: "regression", algorithm: "Beta regression",
    version: "2.0.0", environment: "Production", lifecycle: "Production", lastValidation: "2025-02-14", nextReview: "2026-02-14",
    riskTier: "Tier 1", criticality: "High", requirements: ["IFRS 9 LGD input", "Downturn adjustment review"], health: "Healthy",
    versions: [{ version: "2.0.0", date: "2025-01-30", status: "Active", note: "Collateral haircuts refreshed", metrics: { mae: 0.081, rmse: 0.117 } }],
    findings: [], limitations: ["Small default sample (n=142)."], trainingData: ["DS-002 Loan portfolio"],
    ops: { latencyMs: 0, failures: 0, throughput: 0, availability: 100 },
  },
];

// Drift for MDL-002: reference (approved Jan–Jun 2024) vs current (Q4-25) distributions, 5 bins each.
export const DRIFT_FEATURES = [
  { feature: "debt_service_coverage", ref: [0.12, 0.23, 0.31, 0.22, 0.12], cur: [0.21, 0.27, 0.27, 0.16, 0.09] },
  { feature: "sector_code", ref: [0.18, 0.22, 0.2, 0.25, 0.15], cur: [0.14, 0.2, 0.19, 0.24, 0.23] },
  { feature: "years_in_business", ref: [0.1, 0.2, 0.3, 0.25, 0.15], cur: [0.11, 0.2, 0.29, 0.25, 0.15] },
  { feature: "revenue_band", ref: [0.15, 0.25, 0.3, 0.2, 0.1], cur: [0.16, 0.25, 0.29, 0.2, 0.1] },
  { feature: "utilization_rate", ref: [0.25, 0.3, 0.2, 0.15, 0.1], cur: [0.17, 0.26, 0.22, 0.2, 0.15] },
];

export const PERF_HISTORY = ["Q1-25", "Q2-25", "Q3-25", "Q4-25"].map((q, i) => ({
  quarter: q,
  "MDL-001": [0.814, 0.813, 0.811, 0.812][i],
  "MDL-002": [0.761, 0.754, 0.742, 0.731][i],
  "MDL-003": [0.949, 0.948, 0.946, 0.947][i],
  "MDL-006": [0.78, 0.782, 0.781, 0.781][i],
}));

export const FORECAST_SERIES = [
  { q: "Q1-25", actual: 262.6, predicted: 268.1 },
  { q: "Q2-25", actual: 269.1, predicted: 271.4 },
  { q: "Q3-25", actual: 277.9, predicted: 274.0 },
  { q: "Q4-25", actual: 284.4, predicted: 279.6 },
];

export const LGD_SCATTER = Array.from({ length: 40 }, (_, i) => {
  const actual = ((i * 37) % 100) / 100;
  const noise = (((i * 53) % 21) - 10) / 100;
  return { actual: Math.round(actual * 100) / 100, predicted: Math.min(1, Math.max(0, Math.round((actual * 0.85 + 0.07 + noise) * 100) / 100)) };
});

export const FEATURE_IMPORTANCE: Record<string, { feature: string; value: number }[]> = {
  "MDL-001": [{ feature: "bureau_score", value: 0.31 }, { feature: "dti_ratio", value: 0.22 }, { feature: "months_on_book", value: 0.14 }, { feature: "revolving_util", value: 0.12 }, { feature: "income_verified", value: 0.08 }],
  "MDL-002": [{ feature: "debt_service_coverage", value: 0.28 }, { feature: "utilization_rate", value: 0.21 }, { feature: "sector_code", value: 0.17 }, { feature: "years_in_business", value: 0.13 }, { feature: "revenue_band", value: 0.09 }],
  "MDL-003": [{ feature: "merchant_risk", value: 0.26 }, { feature: "velocity_1h", value: 0.24 }, { feature: "geo_distance", value: 0.18 }, { feature: "device_new", value: 0.12 }, { feature: "amount_z", value: 0.1 }],
  "MDL-006": [{ feature: "aum_trend_90d", value: 0.33 }, { feature: "advisor_contacts", value: 0.19 }, { feature: "tenure", value: 0.15 }, { feature: "product_count", value: 0.12 }],
};
