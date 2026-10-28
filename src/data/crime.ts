// All customers, transactions and entities are fictional and synthetic.
export type AlertStatus = "New" | "Triage" | "Investigation" | "Review" | "Closed" | "Escalated";

export interface CrimeAlert {
  id: string;
  type: "Fraud" | "AML";
  category: string;
  timestamp: string;
  amount: number;
  currency: string;
  channel: string;
  score: number;
  signal: string;
  status: AlertStatus;
  investigator: string;
  customer: string;
  ageDays: number;
  caseId?: string;
}

const FRAUD_CATS = [
  "Card fraud",
  "Suspicious payment",
  "Account takeover",
  "Unusual behavior",
  "Merchant anomaly",
  "Identity",
];
const AML_CATS = [
  "Structuring indicator",
  "Rapid movement of funds",
  "High-risk jurisdiction",
  "Unusual cash activity",
  "Related-party flows",
];
const SIGNALS: Record<string, string> = {
  "Card fraud": "MDL-003 score ≥ 0.82",
  "Suspicious payment": "Rule PAY-07 new payee + high value",
  "Account takeover": "Device change + credential reset",
  "Unusual behavior": "Spend deviation > 4σ",
  "Merchant anomaly": "Merchant refund ratio spike",
  Identity: "Synthetic identity indicators",
  "Structuring indicator": "Scenario AML-02 sub-threshold cash deposits",
  "Rapid movement of funds": "Scenario AML-05 in/out < 48h",
  "High-risk jurisdiction": "Scenario AML-09 counterparty geography",
  "Unusual cash activity": "Scenario AML-01 cash vs profile",
  "Related-party flows": "Scenario AML-11 circular transfers",
};
const INVESTIGATORS = ["Unassigned", "R. Achterberg", "F. Leclerc", "O. Bangura", "V. Iyer"];
const STATUSES: AlertStatus[] = [
  "New",
  "New",
  "Triage",
  "Investigation",
  "Review",
  "Closed",
  "Escalated",
  "Triage",
];
const CHANNELS = ["Card POS", "Card CNP", "Mobile", "Online banking", "Branch", "Wire"];

function s(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export const ALERTS: CrimeAlert[] = Array.from({ length: 36 }, (_, i) => {
  const aml = i % 3 === 0;
  const cats = aml ? AML_CATS : FRAUD_CATS;
  const category = cats[Math.floor(s(i + 1) * cats.length)]!;
  const status = STATUSES[Math.floor(s(i + 2) * STATUSES.length)]!;
  const day = 14 - Math.floor(s(i + 3) * 28);
  const date = new Date(Date.UTC(2026, 0, 14 + Math.min(day, 0)));
  const ageDays = Math.max(0, -Math.min(day, 0));
  return {
    id: `${aml ? "AML" : "FRD"}-${String(4200 + i)}`,
    type: aml ? "AML" : "Fraud",
    category,
    timestamp: `${date.toISOString().slice(0, 10)} ${String(Math.floor(s(i + 4) * 24)).padStart(2, "0")}:${String(Math.floor(s(i + 5) * 60)).padStart(2, "0")}`,
    amount: Math.round((aml ? 9_000 + s(i + 6) * 240_000 : 80 + s(i + 6) * 12_000) * 100) / 100,
    currency: s(i + 8) > 0.85 ? "EUR" : "USD",
    channel: aml ? (s(i + 9) > 0.5 ? "Wire" : "Branch") : CHANNELS[Math.floor(s(i + 9) * 4)]!,
    score: Math.round((0.55 + s(i + 7) * 0.44) * 100) / 100,
    signal: SIGNALS[category]!,
    status: status === "New" ? "New" : status,
    investigator: status === "New" ? "Unassigned" : INVESTIGATORS[1 + Math.floor(s(i + 10) * 4)]!,
    customer: `CUST-${String(10_000 + Math.floor(s(i + 11) * 89_999))}`,
    ageDays,
  };
});

ALERTS[0] = {
  ...ALERTS[0]!,
  id: "AML-4200",
  type: "AML",
  category: "Structuring indicator",
  signal: SIGNALS["Structuring indicator"]!,
  status: "Investigation",
  investigator: "F. Leclerc",
  customer: "CUST-48213",
  amount: 118_400,
  currency: "USD",
  channel: "Branch",
  score: 0.91,
  ageDays: 9,
  caseId: "CASE-0917",
};
ALERTS[1] = {
  ...ALERTS[1]!,
  id: "FRD-4201",
  type: "Fraud",
  category: "Account takeover",
  signal: SIGNALS["Account takeover"]!,
  status: "Triage",
  investigator: "O. Bangura",
  customer: "CUST-20417",
  amount: 7_850,
  currency: "USD",
  channel: "Mobile",
  score: 0.88,
  ageDays: 2,
  caseId: "CASE-0921",
};

export interface CaseRecord {
  id: string;
  title: string;
  type: "Fraud" | "AML";
  alerts: string[];
  customer: string;
  customerRisk: "Low" | "Medium" | "High";
  status: AlertStatus;
  assignee: string;
  priority: "Critical" | "High" | "Medium";
  opened: string;
  slaDue: string;
  summary: string;
  transactions: {
    id: string;
    date: string;
    amount: number;
    currency: string;
    direction: "In" | "Out";
    counterparty: string;
    channel: string;
    flag?: string;
  }[];
  entities: { id: string; name: string; relation: string; risk: "Low" | "Medium" | "High" }[];
  evidence: {
    id: string;
    label: string;
    state: "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "NOT_AVAILABLE";
    source: string;
  }[];
  notes: { author: string; role: "Investigator" | "Reviewer"; at: string; text: string }[];
  timeline: { at: string; event: string }[];
}

export const CASES: CaseRecord[] = [
  {
    id: "CASE-0917",
    title: "Repeated sub-threshold cash deposits",
    type: "AML",
    alerts: ["AML-4200"],
    customer: "CUST-48213",
    customerRisk: "High",
    status: "Investigation",
    assignee: "F. Leclerc",
    priority: "Critical",
    opened: "2026-01-05",
    slaDue: "2026-01-19",
    summary:
      "Suspicious activity indicator: 14 cash deposits between $8,200 and $9,800 across 3 branches within 12 days, followed by outbound wire to a newly added counterparty.",
    transactions: [
      {
        id: "TX-77101",
        date: "2025-12-22",
        amount: 9_400,
        currency: "USD",
        direction: "In",
        counterparty: "Cash — Branch 014",
        channel: "Branch",
        flag: "Sub-threshold",
      },
      {
        id: "TX-77138",
        date: "2025-12-23",
        amount: 9_750,
        currency: "USD",
        direction: "In",
        counterparty: "Cash — Branch 022",
        channel: "Branch",
        flag: "Sub-threshold",
      },
      {
        id: "TX-77190",
        date: "2025-12-26",
        amount: 8_900,
        currency: "USD",
        direction: "In",
        counterparty: "Cash — Branch 014",
        channel: "Branch",
        flag: "Sub-threshold",
      },
      {
        id: "TX-77255",
        date: "2025-12-29",
        amount: 9_800,
        currency: "USD",
        direction: "In",
        counterparty: "Cash — Branch 031",
        channel: "Branch",
        flag: "Sub-threshold",
      },
      {
        id: "TX-77301",
        date: "2026-01-02",
        amount: 9_200,
        currency: "USD",
        direction: "In",
        counterparty: "Cash — Branch 022",
        channel: "Branch",
        flag: "Sub-threshold",
      },
      {
        id: "TX-77420",
        date: "2026-01-03",
        amount: 118_400,
        currency: "USD",
        direction: "Out",
        counterparty: "Vantor Logistics LLC (fictional)",
        channel: "Wire",
        flag: "New counterparty",
      },
    ],
    entities: [
      { id: "ENT-1", name: "CUST-48213 (subject)", relation: "Account holder", risk: "High" },
      {
        id: "ENT-2",
        name: "Vantor Logistics LLC (fictional)",
        relation: "Wire beneficiary",
        risk: "Medium",
      },
      { id: "ENT-3", name: "CUST-51907", relation: "Shared address", risk: "Medium" },
    ],
    evidence: [
      {
        id: "EV-1",
        label: "Cash deposit pattern (14 txns)",
        state: "VERIFIED",
        source: "DS-004 Payments transactions",
      },
      {
        id: "EV-2",
        label: "Customer occupation vs cash volume",
        state: "PARTIALLY_VERIFIED",
        source: "DS-003 Customer master (KYC refreshed 2023)",
      },
      {
        id: "EV-3",
        label: "Beneficiary ownership",
        state: "NOT_AVAILABLE",
        source: "External registry — not connected",
      },
    ],
    notes: [
      {
        author: "F. Leclerc",
        role: "Investigator",
        at: "2026-01-08 10:12",
        text: "Pattern consistent with scenario AML-02. Requested source-of-funds documentation via RM.",
      },
    ],
    timeline: [
      { at: "2026-01-05 07:40", event: "Alert AML-4200 generated by scenario AML-02" },
      { at: "2026-01-05 09:15", event: "Triage completed — escalated to investigation" },
      { at: "2026-01-06 11:02", event: "Assigned to F. Leclerc" },
      { at: "2026-01-08 10:12", event: "Investigator note added" },
    ],
  },
  {
    id: "CASE-0921",
    title: "Possible account takeover via mobile",
    type: "Fraud",
    alerts: ["FRD-4201"],
    customer: "CUST-20417",
    customerRisk: "Low",
    status: "Triage",
    assignee: "O. Bangura",
    priority: "High",
    opened: "2026-01-12",
    slaDue: "2026-01-15",
    summary:
      "New device enrolled after credential reset; two outbound transfers to new payees within 40 minutes.",
    transactions: [
      {
        id: "TX-80011",
        date: "2026-01-12",
        amount: 3_900,
        currency: "USD",
        direction: "Out",
        counterparty: "New payee #1",
        channel: "Mobile",
        flag: "New device",
      },
      {
        id: "TX-80015",
        date: "2026-01-12",
        amount: 3_950,
        currency: "USD",
        direction: "Out",
        counterparty: "New payee #2",
        channel: "Mobile",
        flag: "New device",
      },
    ],
    entities: [
      { id: "ENT-4", name: "CUST-20417 (subject)", relation: "Account holder", risk: "Low" },
      { id: "ENT-5", name: "Device D-88a1", relation: "New device", risk: "High" },
    ],
    evidence: [
      {
        id: "EV-4",
        label: "Device change log",
        state: "VERIFIED",
        source: "Digital channel logs (simulated)",
      },
      {
        id: "EV-5",
        label: "Customer confirmation call",
        state: "UNVERIFIED",
        source: "Pending outreach",
      },
    ],
    notes: [],
    timeline: [
      { at: "2026-01-12 18:22", event: "Alert FRD-4201 generated" },
      { at: "2026-01-12 18:40", event: "Assigned to O. Bangura" },
    ],
  },
];

export const CRIME_TREND = [
  { week: "W49", fraud: 412, aml: 96 },
  { week: "W50", fraud: 438, aml: 102 },
  { week: "W51", fraud: 471, aml: 99 },
  { week: "W52", fraud: 520, aml: 88 },
  { week: "W01", fraud: 489, aml: 111 },
  { week: "W02", fraud: 455, aml: 117 },
];

export const INVESTIGATORS_LIST = INVESTIGATORS.slice(1);
