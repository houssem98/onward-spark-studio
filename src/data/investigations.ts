export type EvidenceState = "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "CONFLICTING_EVIDENCE" | "NOT_AVAILABLE";
export type InvStatus = "Draft" | "In Progress" | "Pending Review" | "Approved" | "Closed";

export interface Finding {
  id: string;
  claim: string;
  evidence: string;
  source: string;
  period: string;
  method: string;
  impact?: string;
  state: EvidenceState;
  kind: "Measured" | "Hypothesis";
  limitations: string;
  next: string;
}

export interface Investigation {
  id: string;
  title: string;
  question: string;
  module: string;
  department: string;
  owner: string;
  created: string;
  period: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: InvStatus;
  state: EvidenceState;
  report?: string;
  outstanding: number;
  findings: Finding[];
  contradictions: string[];
  limitations: string[];
}

export const INVESTIGATIONS: Investigation[] = [
  {
    id: "INV-2025-014", title: "Credit revenue growth vs peers", question: "Why did our credit division revenue grow more slowly than our competitors this year?",
    module: "Performance", department: "Credit", owner: "A. Haddad", created: "2026-01-06", period: "FY2025", priority: "High", status: "Pending Review",
    state: "PARTIALLY_VERIFIED", report: "RPT-FY25-PERF", outstanding: 2,
    findings: [
      { id: "F-014-1", claim: "Lower average loan volume explains −$18.0M of the −$30.0M gap to peer benchmark.", evidence: "Average credit balances vs peer-implied volumes", source: "DS-002 Loan portfolio; DS-011 Competitor metrics", period: "FY2025", method: "Volume effect = (Vol_NS − Vol_peer) × Yield_peer", impact: "−$18.0M", state: "PARTIALLY_VERIFIED", kind: "Measured", limitations: "Peer volumes derived from public disclosures; Cascade includes leasing.", next: "Confirm peer balance definitions with Strategy team." },
      { id: "F-014-2", claim: "Effective yield 14bp below peers contributes −$7.0M.", evidence: "Effective yield by product", source: "DS-009 Finance reporting", period: "FY2025", method: "Price effect = (Yield_NS − Yield_peer) × Vol_NS", impact: "−$7.0M", state: "VERIFIED", kind: "Measured", limitations: "Internal yields reconcile to GL; peer yields are illustrative.", next: "Review SME pricing grid." },
      { id: "F-014-3", claim: "Product mix weighted toward lower-yield corporate facilities contributes −$3.0M.", evidence: "Mix by segment", source: "DS-010 Curated credit dataset", period: "FY2025", method: "Mix effect (segment-weighted)", impact: "−$3.0M", state: "PARTIALLY_VERIFIED", kind: "Measured", limitations: "DQ-101 reconciliation issue open on source dataset.", next: "Resolve DQ-101 before sign-off." },
      { id: "F-014-4", claim: "SME approval delays may have reduced originations.", evidence: "Underwriting time rose from 1.4 to 1.8 days", source: "Credit funnel (synthetic)", period: "FY2025", method: "Hypothesis — correlation only", state: "UNVERIFIED", kind: "Hypothesis", limitations: "No causal test; capacity data incomplete.", next: "Run cohort comparison of approval time vs acceptance." },
      { id: "F-014-5", claim: "Residual −$2.0M is not explained by measured drivers.", evidence: "Bridge residual", source: "Deterministic calculation", period: "FY2025", method: "Gap − Σ measured effects", impact: "−$2.0M", state: "VERIFIED", kind: "Measured", limitations: "Residual is unexplained, not attributed.", next: "Investigate fee waivers and funding costs." },
    ],
    contradictions: ["Prior-period bridge shows volume growth of +$9.0M year on year — volume underperformance is relative to peers, not absolute decline."],
    limitations: ["Peer metrics are illustrative and partially comparable.", "Funding cost allocation not yet available for credit division."],
  },
  {
    id: "INV-2026-002", title: "SME model input drift", question: "Is the SME credit risk model still fit for purpose after input drift?", module: "Model Governance", department: "Credit", owner: "T. Ibrahim",
    created: "2026-01-10", period: "Q4-25", priority: "Critical", status: "In Progress", state: "UNVERIFIED", outstanding: 3,
    findings: [{ id: "F-002-1", claim: "debt_service_coverage PSI exceeds 0.10 vs approved reference period.", evidence: "Feature distribution comparison", source: "DS-012 Model predictions", period: "Q4-25 vs H1-24", method: "PSI", state: "VERIFIED", kind: "Measured", limitations: "Drift does not by itself prove the model is inaccurate.", next: "Outcome-based backtest once 12-month defaults mature." }],
    contradictions: [], limitations: ["Default outcomes for 2025 vintages not yet observable."],
  },
  {
    id: "INV-2026-003", title: "Loan dataset GL reconciliation break", question: "Why does the curated credit dataset not reconcile to the GL?", module: "Data Governance", department: "Finance & Operations", owner: "G. Rossi",
    created: "2026-01-13", period: "Dec-25", priority: "High", status: "In Progress", state: "PARTIALLY_VERIFIED", outstanding: 1,
    findings: [{ id: "F-003-1", claim: "1,284 facilities lack GL mapping causing a $4.2M difference.", evidence: "Rule DQ-101 output", source: "DS-010; DS-001", period: "Dec-25", method: "Control total reconciliation", impact: "$4.2M", state: "VERIFIED", kind: "Measured", limitations: "Mapping root cause unconfirmed.", next: "Confirm migration batch with Data Platform." }],
    contradictions: [], limitations: [],
  },
  {
    id: "INV-2026-004", title: "Structuring indicators — CASE-0917", question: "Does CASE-0917 require escalation?", module: "Financial Crime", department: "Fraud & Financial Crime Ops", owner: "F. Leclerc",
    created: "2026-01-05", period: "Dec-25 – Jan-26", priority: "Critical", status: "In Progress", state: "PARTIALLY_VERIFIED", outstanding: 1,
    findings: [{ id: "F-004-1", claim: "Deposit pattern matches structuring indicator scenario.", evidence: "14 cash deposits $8.2k–$9.8k", source: "DS-004", period: "Dec-25", method: "Scenario AML-02", state: "VERIFIED", kind: "Measured", limitations: "Indicator, not a determination.", next: "Obtain source-of-funds documentation." }],
    contradictions: [], limitations: ["Beneficial ownership registry not connected."],
  },
];

export interface Action {
  id: string;
  action: string;
  finding: string;
  owner: string;
  due: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Done";
  outcome: string;
  evidence?: string;
}

export const ACTIONS: Action[] = [
  { id: "ACT-101", action: "Review SME pricing grid against peer yields", finding: "F-014-2", owner: "A. Haddad", due: "2026-02-15", priority: "High", status: "In Progress", outcome: "Close 5–8bp of yield gap" },
  { id: "ACT-102", action: "Resolve GL mapping for 1,284 facilities", finding: "F-003-1", owner: "G. Rossi", due: "2026-01-24", priority: "High", status: "Open", outcome: "DQ-101 reconciles within tolerance" },
  { id: "ACT-103", action: "Commission independent validation of MDL-002", finding: "F-002-1", owner: "T. Ibrahim", due: "2026-02-28", priority: "High", status: "Open", outcome: "Validation sign-off or remediation plan" },
  { id: "ACT-104", action: "Cohort analysis of SME approval time vs acceptance", finding: "F-014-4", owner: "K. Mensah", due: "2026-03-10", priority: "Medium", status: "Open", outcome: "Confirm or reject capacity hypothesis" },
  { id: "ACT-105", action: "Request source-of-funds for CUST-48213", finding: "F-004-1", owner: "F. Leclerc", due: "2026-01-17", priority: "High", status: "In Progress", outcome: "Evidence for case disposition" },
];

export const REPORTS = [
  { id: "RPT-FY25-PERF", title: "FY2025 Full-Year Performance Review", owner: "CFO Office", period: "FY2025", investigation: "INV-2025-014", state: "PARTIALLY_VERIFIED" as EvidenceState, status: "Pending Review", updated: "2026-01-13" },
  { id: "RPT-RISK-Q4", title: "Q4-25 Executive Risk Report", owner: "CRO Office", period: "Q4-25", investigation: "INV-2026-002", state: "UNVERIFIED" as EvidenceState, status: "Draft", updated: "2026-01-12" },
];

export const NEXT_STEPS = [
  { id: "REC-1", text: "Resolve DQ-101 before FY report sign-off", owner: "G. Rossi", due: "2026-01-24", link: "/data" },
  { id: "REC-2", text: "Complete overdue validation of MDL-002", owner: "T. Ibrahim", due: "2026-02-28", link: "/models/MDL-002" },
  { id: "REC-3", text: "Decide escalation of CASE-0917", owner: "F. Leclerc", due: "2026-01-19", link: "/crime/CASE-0917" },
  { id: "REC-4", text: "Review SME pricing vs peers", owner: "A. Haddad", due: "2026-02-15", link: "/performance" },
];
