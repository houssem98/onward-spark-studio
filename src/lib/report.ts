import type { QualityIssue } from "@/data/datasets";
import type { Action, Investigation, Report } from "@/data/investigations";
import {
  costToIncome,
  fmtM,
  fmtPct,
  growth,
  mean,
  pct,
  reconcileBridge,
  round,
  sum,
} from "@/lib/calc";
import { DEFINITIONS } from "@/lib/definitions";
import { DEMO_ENTITY, SHOWN_WITH, type EvidenceState } from "@/lib/evidence";
import {
  assignEvidenceState,
  findingAssessment,
  isVerified,
  reportState,
  verifiedLabel,
} from "@/lib/evidence-policy";
import { catalogOf, resolveScope } from "@/lib/scope";
import type { AuditEvent, FinanceData } from "@/repo/types";

// The report as plain lines, built once: the page, the HTML and the Markdown all render this, so
// no export can say what the page does not.
export interface SignOff {
  by: string;
  at: string;
}
export interface ReportDoc {
  title: string;
  header: string[];
  sections: { title: string; lines: string[] }[];
  verified: boolean;
  state: EvidenceState;
}
export interface ReportInput {
  report: Report & { synthetic?: true };
  inv: Investigation;
  finance: FinanceData;
  issues: QualityIssue[];
  actions: Action[];
  audit: AuditEvent[];
  /** The environment line every export starts with. */
  notice: string;
  signoff?: SignOff;
}

/** What a saved version keeps: every input the report is built from, so re-rendering it reproduces it. */
export type ReportSnapshot = Omit<ReportInput, "notice">;
export interface ReportVersion {
  report: string;
  version: number;
  savedAt: string;
  savedBy: string;
  snapshot: ReportSnapshot;
  synthetic?: true;
}

export const SYNTHETIC_LINE =
  "Synthetic: built on synthetic demo records of the fictional Northstar Bank; nothing here describes a real bank.";

/** Verified only when every finding is VERIFIED and a reviewer has signed off. */
export { verifiedLabel };

const num = (v: number) => (v < 0 ? `−${-v}` : String(v));
const word = (s: EvidenceState) => s.toLowerCase().replace(/_/g, " ");

export function buildReport(i: ReportInput): ReportDoc {
  const { report, inv, finance } = i;
  const states = inv.findings.map((f) => f.state);
  const assessed = inv.findings.map((f) => ({ f, a: findingAssessment(f) }));
  const cited = new Set(assessed.flatMap(({ a }) => a.sources.map((s) => s.id)));
  const issues = i.issues.filter((x) => cited.has(x.dataset) && x.status !== "Resolved");
  // Open includes the data-quality issues section 10 lists as open on the datasets cited.
  const items = inv.outstanding + inv.contradictions.length + issues.length;
  const state = reportState(states, items, i.signoff !== undefined);
  const verified = isVerified(state);
  const unverified = states.filter((s) => !isVerified(s)).length;
  const why = [
    ...(states.length ? [] : ["it has no findings"]),
    ...(unverified ? [`${unverified} of ${states.length} findings are not verified`] : []),
    ...(items ? [`${items} open items remain`] : []),
    ...(i.signoff ? [] : ["no reviewer has signed off"]),
  ];
  const label = verified
    ? "Verified: every finding is verified, nothing is open and a reviewer signed off."
    : `Not labeled Verified: ${why.length > 1 ? `${why.slice(0, -1).join(", ")}, and ${why.at(-1)}` : why[0]}.`;

  const cat = catalogOf(finance, DEMO_ENTITY);
  const r = resolveScope(inv.question, cat);
  const scope = r.kind === "resolved" ? r : null;
  const none = `None in scope: ${r.kind === "unsupported" ? r.reason : "the question leaves its scope open."}`;
  const bridge = scope ? finance.bridges.find((b) => b.id === "peer") : undefined;
  const rec = bridge && reconcileBridge(bridge);
  const peers = scope ? scope.scope.cohort.map((id) => cat.peers.find((p) => p.id === id)!) : [];
  const dept = scope && finance.departments.find((d) => d.id === scope.scope.department)!;

  const card = finance.scorecard[report.period as keyof typeof finance.scorecard];
  const kpis =
    typeof card === "object"
      ? (() => {
          const income = card.nii + card.nonInterest;
          const opex = sum(
            finance.departments.map((d) =>
              report.period === "FY2025" ? d.expenses : d.priorExpenses,
            ),
          );
          return [
            `${DEFINITIONS.operating_income.label} ${report.period}: ${fmtM(income)}`,
            `${DEFINITIONS.nim.label} ${report.period}: ${fmtPct(pct(card.nii, card.avgEarningAssets), 2)}`,
            `${DEFINITIONS.cost_to_income.label} ${report.period}: ${fmtPct(costToIncome(opex, income))}`,
            `${DEFINITIONS.roe.label} ${report.period}: ${fmtPct(pct(card.netIncome, card.avgEquity))}`,
          ];
        })()
      : [`No scorecard for ${report.period} in this data.`];

  const gaps = inv.findings
    .filter((f) => (SHOWN_WITH.gaps as EvidenceState[]).includes(f.state))
    .map((f) => `${f.id}: ${assignEvidenceState(findingAssessment(f)).reasons.join(" ")}`);
  const ids = new Set(inv.findings.map((f) => f.id));
  const acts = i.actions.filter((a) => ids.has(a.finding));
  const actionIds = new Set(acts.map((a) => a.id));
  // The trail of the report and its investigation, its findings' and actions' events, and its
  // downloads, which are logged under the file name.
  const audit = i.audit.filter(
    (e) =>
      e.entity.startsWith(report.id) ||
      e.entity === inv.id ||
      ids.has(e.entity) ||
      actionIds.has(e.entity),
  );
  // Only a sign-off makes a report Approved; a version without one is still under review.
  const status = i.signoff
    ? "Approved"
    : report.status === "Approved"
      ? "Pending Review"
      : report.status;
  const measured = bridge
    ? sum(bridge.steps.filter((s) => s.kind === "measured").map((s) => s.value))
    : 0;
  const residual = bridge
    ? sum(bridge.steps.filter((s) => s.kind === "residual").map((s) => s.value))
    : 0;
  const peerMean = mean(peers.map((p) => p.creditRevenue!));

  const sections: [string, string[]][] = [
    [
      "Executive summary",
      [
        `Question: ${inv.question}`,
        ...(bridge && rec
          ? [
              `Credit revenue of ${fmtM(bridge.actual)} against a peer benchmark of ${fmtM(bridge.base)}: a gap of ${fmtM(rec.gap)}. Measured effects explain ${fmtM(measured)}; ${fmtM(residual)} is unexplained.`,
            ]
          : []),
        `${inv.findings.length} findings: ${inv.findings.filter((f) => f.kind === "Measured").length} measured, ${inv.findings.filter((f) => f.kind === "Hypothesis").length} hypothesis. Evidence state: ${word(inv.state)}.`,
        label,
      ],
    ],
    [
      "Scope and methodology",
      scope
        ? [
            `Entity: ${scope.scope.entity}`,
            `Department: ${dept!.name} · Period: ${scope.scope.period} · Currency: ${scope.scope.currency} ${finance.bank.unit}`,
            `Comparison cohort: ${peers.map((p) => p.name).join(", ")}`,
            `Definitions: ${scope.scope.definitions.map((d) => DEFINITIONS[d].label).join(", ")}`,
            "Method: deterministic arithmetic over the data; no language model sets a value or a state.",
          ]
        : [
            `Department: ${inv.department} · Period: ${inv.period} · Module: ${inv.module}`,
            `Scope: ${none.replace(/^None in scope: /, "")}`,
            "Method: deterministic arithmetic over the data; no language model sets a value or a state.",
          ],
    ],
    ["KPI scorecard", kpis],
    [
      "Peer group and comparability",
      scope
        ? cat.peers.map((p) => {
            const left = scope.left.find((x) => x.id === p.id);
            return `${p.name}: ${p.source.replace(/_/g, " ").toLowerCase()}, ${p.period}, comparability ${p.comparability}${p.warning ? ` (${p.warning})` : ""} · ${left ? `left out: ${left.reason}` : "in the cohort"}`;
          })
        : [none],
    ],
    [
      "Revenue and profitability trends",
      dept
        ? [
            `${DEFINITIONS.credit_revenue_growth.label}: ${fmtPct(growth(dept.revenue, dept.prior))} (${fmtM(dept.prior)} to ${fmtM(dept.revenue)})`,
          ]
        : [none],
    ],
    [
      "Variance decomposition",
      bridge && rec
        ? [
            `${bridge.baseLabel} ${fmtM(bridge.base)}`,
            ...bridge.steps.map((s) => `${s.label} ${fmtM(s.value)} (${s.kind})`),
            `${bridge.actualLabel} ${fmtM(bridge.actual)}`,
            rec.reconciles
              ? "The steps reconcile to the gap."
              : `The steps miss the gap by ${rec.difference}.`,
          ]
        : [none],
    ],
    [
      "Root-cause findings",
      inv.findings.map((f) => `${f.id} · ${f.kind} · ${word(f.state)} · ${f.claim}`),
    ],
    [
      "Evidence and source register",
      assessed.flatMap(({ f, a }) =>
        a.sources.length
          ? a.sources.map(
              (s) =>
                `${f.id}: ${s.name} · ${s.authority.replace(/_/g, " ")} · ${s.entity} · ${s.period} · as of ${s.asOf}`,
            )
          : [`${f.id}: no source is linked.`],
      ),
    ],
    [
      "Reproducible calculations",
      bridge && rec
        ? [
            `Gap = ${bridge.actual} − ${bridge.base} = ${num(rec.gap)}`,
            `Steps = ${bridge.steps.map((s) => num(s.value)).join(" + ")} = ${num(rec.explained)}`,
            `Difference = ${rec.difference}: ${rec.reconciles ? "reconciles" : "does not reconcile"}`,
            `Peer benchmark: mean of ${peers.map((p) => p.creditRevenue).join(", ")} = ${round(peerMean, 1)}; the bridge uses ${bridge.base}`,
            `Unit: every figure above is in ${finance.bank.currency} ${finance.bank.unit}.`,
          ]
        : [none],
    ],
    [
      "Data quality and verification results",
      issues.length
        ? issues.map((x) => `${x.id} ${x.title} · ${x.dataset} · ${x.severity} · ${x.status}`)
        : ["No open issue on the datasets the findings cite."],
    ],
    ["Limitations and unresolved questions", [...inv.limitations, ...inv.contradictions, ...gaps]],
    [
      "Recommendations and impact assumptions",
      inv.findings.map((f) => `${f.id}: ${f.next} (impact: ${f.impact ?? "not measured"})`),
    ],
    [
      "Action plan",
      acts.length
        ? acts.map((a) => `${a.id} ${a.action} · owner ${a.owner} · due ${a.due} · ${a.status}`)
        : ["No actions yet."],
    ],
    [
      "Reviewer sign-off and audit trail",
      [
        i.signoff
          ? `Signed off by ${i.signoff.by} on ${i.signoff.at}.`
          : "No reviewer has signed off.",
        ...(audit.length
          ? audit.map((e) => `${e.at} · ${e.actor} · ${e.action}`)
          : ["No audit event is recorded for this report or its investigation."]),
      ],
    ],
  ];

  return {
    title: report.title,
    header: [
      `${report.id} · ${report.period} · owner ${report.owner} · ${status} · updated ${report.updated}`,
      i.notice,
      ...(report.synthetic ? [SYNTHETIC_LINE] : []),
    ],
    sections: sections.map(([t, lines], n) => ({ title: `${n + 1}. ${t}`, lines })),
    verified,
    state,
  };
}

const ENTITY: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const html = (s: string) => s.replace(/[&<>"']/g, (c) => ENTITY[c]!);

export const reportHtml = (d: ReportDoc) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${html(d.title)}</title></head><body><h1>${html(d.title)}</h1>${d.header
    .map((l) => `<p>${html(l)}</p>`)
    .join("")}${d.sections
    .map(
      (s) =>
        `<h2>${html(s.title)}</h2><ul>${s.lines.map((l) => `<li>${html(l)}</li>`).join("")}</ul>`,
    )
    .join("")}</body></html>`;

// Characters Markdown would read as markup are escaped, so a line cannot become a link or HTML.
const md = (s: string) => s.replace(/[\\`*_{}[\]()#+!|<>]/g, "\\$&");

export const reportMarkdown = (d: ReportDoc) =>
  [
    `# ${md(d.title)}`,
    ...d.header.map((l) => `_${md(l)}_`),
    ...d.sections.flatMap((s) => ["", `## ${md(s.title)}`, ...s.lines.map((l) => `- ${md(l)}`)]),
  ].join("\n");
