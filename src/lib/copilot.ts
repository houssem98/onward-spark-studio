// Predefined analytical routing — no live LLM is connected. Answers are composed from deterministic demo data.
import { diff, fmtFixed, fmtM, fmtPct, growth, reconcileBridge, pct } from "@/lib/calc";
import { DEFINITIONS, DEMO_DATE, type DefinitionId } from "@/lib/definitions";
import { DEMO_ENTITY, demoSource, sourceOf, type EvidenceState, type Source } from "@/lib/evidence";
import { assignEvidenceState, summarizeStates, type Assessment } from "@/lib/evidence-policy";
import type { CrimeData, DatasetsData, FinanceData, ModelsData } from "@/repo/types";

// A figure names its definition; a list entry (a dataset, a case) carries its own label.
export type CopilotMetric =
  { def: DefinitionId; period?: string; value: string } | { label: string; value: string };

export const metricLabel = (m: CopilotMetric) =>
  "def" in m ? `${DEFINITIONS[m.def].label}${m.period ? ` ${m.period}` : ""}` : m.label;

export interface CopilotAnswer {
  intent: string;
  scope: string;
  metrics: CopilotMetric[];
  summary: string[];
  /** The policy's state over `assessments`; anything listed as missing keeps it short of Verified. */
  state: EvidenceState;
  assessments: Assessment[];
  missing: string[];
  links: { label: string; to: string }[];
}

const decided = (a: Omit<CopilotAnswer, "state">): CopilotAnswer => ({
  ...a,
  state: summarizeStates(
    a.assessments.map((x) => assignEvidenceState(x).state),
    a.missing.length,
  ),
});

// A measured figure, the source that gives it, and the source's value.
const figure = (
  text: string,
  period: string,
  value: number,
  sources: Source[],
  by: string,
  metricId?: DefinitionId,
): Assessment => ({
  claim: { id: metricId ?? text, text, kind: "measured", ...(metricId ? { metricId } : {}) },
  claimed: value,
  scope: { entity: DEMO_ENTITY, period },
  sources,
  values: [{ sourceId: by, value }],
  today: DEMO_DATE,
});

const AS_OF = `As of ${DEMO_DATE}`;
const system = (id: string, name: string, authority: Source["authority"]) =>
  demoSource({ id, name, authority, period: AS_OF, asOf: DEMO_DATE, freshForDays: 2 });

export function answer(
  q: string,
  data: { finance: FinanceData; models: ModelsData; datasets: DatasetsData; crime: CrimeData },
): CopilotAnswer {
  const { departments, scorecard, bridges } = data.finance;
  const { models } = data.models;
  const { datasets } = data.datasets;
  const t = q.toLowerCase();
  const s = {
    certification: data.datasets.certification,
    issues: data.datasets.issues,
    cases: data.crime.cases,
  };
  const ds = (id: string, period: string) =>
    sourceOf(
      datasets.find((d) => d.id === id)!,
      period,
    );
  const peerGap = () => {
    const r = reconcileBridge(bridges.find((x) => x.id === "peer")!);
    const a = figure(
      "Credit revenue gap to the peer benchmark",
      "FY2025",
      r.gap,
      [ds("DS-009", "FY2025"), ds("DS-011", "FY2025")],
      "DS-011",
      "revenue_gap",
    );
    return { ...a, reconciles: r.reconciles };
  };

  if (/(credit).*(peer|competitor)|competitor|peer/.test(t)) {
    const b = bridges.find((x) => x.id === "peer")!;
    const r = reconcileBridge(b);
    const credit = departments.find((d) => d.id === "credit")!;
    const priorVolume = bridges
      .find((x) => x.id === "prior")!
      .steps.find((x) => x.label === "Volume")!.value;
    return decided({
      intent: "Credit performance vs peer group",
      scope: "Credit division · FY2025 · USD M · peers: Harborline, Meridian, Cascade",
      metrics: [
        { def: "credit_revenue", period: "FY2025", value: fmtM(credit.revenue) },
        { def: "credit_revenue_growth", value: fmtPct(growth(credit.revenue, credit.prior)) },
        { def: "peer_benchmark", value: fmtM(b.base) },
        {
          def: "revenue_gap",
          value: `${fmtM(r.gap)} · ${r.reconciles ? "reconciles" : "does not reconcile"}`,
        },
      ],
      summary: [
        `Measured: ${b.steps
          .filter((x) => x.kind === "measured")
          .map((x) => `${x.label.toLowerCase()} ${fmtM(x.value)}`)
          .join(
            ", ",
          )}; residual ${fmtM(b.steps.find((x) => x.kind === "residual")!.value)} unexplained.`,
        "Hypothesis (unverified): SME underwriting delays may have reduced originations.",
        `Contradiction: volume grew +${fmtM(priorVolume)} year on year — the shortfall is relative to peers.`,
      ],
      assessments: [peerGap()],
      missing: [
        "Peer funding costs not available",
        "Cascade credit revenue includes leasing (low comparability)",
        "DQ-101 open on curated credit dataset",
      ],
      links: [
        { label: "Open INV-2025-014", to: "/investigations/INV-2025-014" },
        { label: "Revenue bridge", to: "/performance" },
      ],
    });
  }
  if (/target|missed|business unit/.test(t)) {
    const missed = departments.filter((d) => !d.costCenter && d.revenue < d.target);
    return decided({
      intent: "Business units vs revenue target",
      scope: "All revenue-generating units · FY2025 · budget basis",
      metrics: missed.map((d) => ({
        label: d.name,
        value: `${fmtM(d.revenue)} vs ${fmtM(d.target)} (${fmtM(d.revenue - d.target)})`,
      })),
      summary: [
        `${missed.length} of ${departments.filter((d) => !d.costCenter).length} revenue-generating units missed target.`,
      ],
      assessments: [
        figure(
          "Revenue-generating units below their FY2025 target",
          "FY2025",
          missed.length,
          [ds("DS-009", "FY2025")],
          "DS-009",
        ),
      ],
      missing: ["Targets are synthetic budget figures"],
      links: [{ label: "Department performance", to: "/performance" }],
    });
  }
  if (/\bmargin\b|\bnim\b/.test(t)) {
    const a = scorecard.FY2025,
      b = scorecard.FY2024;
    const n1 = pct(a.nii, a.avgEarningAssets),
      n0 = pct(b.nii, b.avgEarningAssets);
    return decided({
      intent: "Net interest margin change",
      scope: "Bank-wide · FY2025 vs FY2024",
      metrics: [
        { def: "nim", period: "FY2025", value: fmtPct(n1, 2) },
        { def: "nim", period: "FY2024", value: fmtPct(n0, 2) },
        {
          def: "earning_assets_growth",
          value: fmtPct(growth(a.avgEarningAssets, b.avgEarningAssets)),
        },
      ],
      summary: [
        `NIM moved ${fmtFixed(diff(n1, n0), 2, "pp")}: earning assets grew faster (${fmtPct(growth(a.avgEarningAssets, b.avgEarningAssets))}) than NII (${fmtPct(growth(a.nii, b.nii))}).`,
        "Deposit repricing is a plausible driver but not evidenced — funding cost data not loaded.",
      ],
      assessments:
        n1 === null
          ? []
          : [
              figure(
                "Net interest margin, FY2025",
                "FY2025",
                n1,
                [ds("DS-009", "FY2025")],
                "DS-009",
                "nim",
              ),
            ],
      missing: ["Deposit beta / funding cost dataset"],
      links: [{ label: "Executive scorecard", to: "/performance" }],
    });
  }
  if (/dataset|lineage|affect.*report|executive report/.test(t) && !/quality/.test(t)) {
    const feeding = datasets.filter(
      (d) => d.downstream.includes("RPT-FY25-PERF") || d.downstream.includes("RPT-RISK-Q4"),
    );
    return decided({
      intent: "Datasets feeding executive reports",
      scope: "Lineage (illustrative) · RPT-FY25-PERF, RPT-RISK-Q4",
      metrics: feeding.map((d) => ({
        label: `${d.id} ${d.name}`,
        value: s.certification[d.id] ?? "Unavailable",
      })),
      summary: [
        `${feeding.length} datasets feed executive reports; ${feeding.filter((d) => s.certification[d.id] !== "Certified").length} are not certified.`,
      ],
      assessments: [
        figure(
          "Datasets feeding the executive reports",
          AS_OF,
          feeding.length,
          [system("LINEAGE", "Lineage (illustrative)", "synthetic")],
          "LINEAGE",
        ),
      ],
      missing: ["Lineage is illustrative, not harvested from live systems"],
      links: [{ label: "Lineage explorer", to: "/data" }],
    });
  }
  if (/quality/.test(t)) {
    const iss = s.issues.filter(
      (i) =>
        ["DS-002", "DS-010", "DS-006", "DS-011"].includes(i.dataset) && i.status !== "Resolved",
    );
    return decided({
      intent: "Data-quality issues affecting credit reporting",
      scope: "Credit datasets · open issues",
      metrics: iss.map((i) => ({
        label: `${i.id} · ${i.dimension}`,
        value: `${i.severity} · ${i.status}`,
      })),
      summary: [`${iss.length} open issues affect credit reporting.`],
      assessments: [
        figure(
          "Open data-quality issues on credit datasets",
          AS_OF,
          iss.length,
          [system("DQ-RULES", "Data-quality rules (simulated)", "internal")],
          "DQ-RULES",
          "open_dq_issues",
        ),
      ],
      missing: [],
      links: [{ label: "Data quality", to: "/data" }],
    });
  }
  if (/model|validation|overdue/.test(t)) {
    const today = DEMO_DATE;
    const overdue = models.filter((m) => m.nextReview < today);
    return decided({
      intent: "Models with overdue validation",
      scope: `Model inventory · as of ${today}`,
      metrics: overdue.map((m) => ({ label: `${m.id} ${m.name}`, value: `due ${m.nextReview}` })),
      summary: [
        `${overdue.length} model(s) overdue for review. Drift on MDL-002 requires assessment; drift alone does not prove inaccuracy.`,
      ],
      assessments: [
        figure(
          "Models overdue for review",
          AS_OF,
          overdue.length,
          [system("INVENTORY", "Model inventory (simulated)", "internal")],
          "INVENTORY",
          "overdue_reviews",
        ),
      ],
      missing: [],
      links: [
        { label: "Model inventory", to: "/models" },
        { label: "MDL-002", to: "/models/MDL-002" },
      ],
    });
  }
  if (/fraud|aml|case/.test(t)) {
    const open = s.cases.filter((c) => c.status !== "Closed");
    return decided({
      intent: "Highest-priority open financial crime cases",
      scope: "Fraud & AML · open cases",
      metrics: open.map((c) => ({
        label: `${c.id} (${c.priority})`,
        value: `${c.status} · ${c.assignee}`,
      })),
      summary: open.map(
        (c) => `${c.id}: ${c.title} — suspicious activity indicator, pending review.`,
      ),
      assessments: [
        figure("Open financial crime cases", AS_OF, open.length, [ds("DS-008", AS_OF)], "DS-008"),
      ],
      missing: ["Beneficial ownership registry not connected"],
      links: [{ label: "Financial crime center", to: "/crime" }],
    });
  }
  if (/verified|year-end|review|report/.test(t)) {
    return decided({
      intent: "Generate year-end department review",
      scope: "FY2025 · all departments",
      metrics: [{ label: "Linked report", value: "RPT-FY25-PERF" }],
      summary: [
        "A draft can be generated, but it cannot be labeled Verified: DQ-101 and peer comparability limitations remain open.",
      ],
      assessments: [peerGap()],
      missing: ["Reviewer sign-off", "DQ-101 resolution"],
      links: [{ label: "Open report", to: "/reports/RPT-FY25-PERF" }],
    });
  }
  return decided({
    intent: "Unrecognized question",
    scope: "—",
    metrics: [],
    summary: [
      "This demo workflow supports a fixed set of analytical intents. Try one of the suggested questions.",
    ],
    assessments: [],
    missing: ["No live AI provider connected"],
    links: [],
  });
}

export const SUGGESTIONS = [
  "Why did our credit division revenue grow more slowly than our competitors this year?",
  "Which business units missed their revenue targets?",
  "Why did our net interest margin fall?",
  "Which datasets affect this executive report?",
  "Which models have overdue validation reviews?",
  "Which data-quality issues affect credit reporting?",
  "Summarize the highest-priority open fraud cases.",
  "Generate a verified year-end department review.",
];
