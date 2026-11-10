import * as credit from "@/data/credit";
import * as crime from "@/data/crime";
import * as datasets from "@/data/datasets";
import { EXPLANATIONS } from "@/data/explanations";
import * as finance from "@/data/finance";
import * as investigations from "@/data/investigations";
import * as models from "@/data/models";
import type { Certification, QualityIssue } from "@/data/datasets";
import type { AlertStatus, CaseRecord, CrimeAlert } from "@/data/crime";
import type { Action, Investigation } from "@/data/investigations";
import type { Lifecycle } from "@/data/models";
import { DEMO_DATE } from "@/lib/definitions";
import { frozenCopy } from "@/lib/frozen";
import type { ReportSnapshot, ReportVersion } from "@/lib/report";
import * as review from "@/lib/review";
import { refuseUnearnedVerified, reportState, withPolicyStates } from "@/lib/evidence-policy";
import { globalImportance } from "@/lib/explain";
import type {
  AccessRequest,
  AuditEvent,
  DriftAlert,
  FindingStatus,
  ModelDecision,
  Repository,
} from "./types";

const USER = { name: "Sarah Mitchell", role: "Chief Risk Officer" };

interface State {
  modelLifecycle: Record<string, Lifecycle>;
  modelDecisions: ModelDecision[];
  modelVersion: Record<string, string>;
  findingStatus: Record<string, FindingStatus>;
  driftAlerts: DriftAlert[];
  certification: Record<string, Certification>;
  issues: QualityIssue[];
  accessRequests: AccessRequest[];
  alerts: CrimeAlert[];
  cases: CaseRecord[];
  investigations: Investigation[];
  actions: Action[];
  audit: AuditEvent[];
}

const now = () => new Date().toISOString().slice(0, 16).replace("T", " ");

let state: State = {
  modelLifecycle: Object.fromEntries(models.MODELS.map((m) => [m.id, m.lifecycle])),
  modelDecisions: [
    {
      model: "MDL-002",
      decision: "Approved",
      by: "Model Risk Committee",
      at: "2024-10-15 14:00",
      comment: "Approved v2.4.1 with reference period H1-24.",
    },
  ],
  modelVersion: Object.fromEntries(models.MODELS.map((m) => [m.id, m.version])),
  findingStatus: Object.fromEntries(
    models.MODELS.flatMap((m) => m.findings.map((f) => [f.id, f.status])),
  ),
  driftAlerts: [
    {
      id: "ALT-MDL-002",
      model: "MDL-002",
      severity: "High",
      title: "Input distribution shift vs approved reference period",
      status: "Open",
      owner: "Unassigned",
      assessment: "",
      disposition: "",
      raised: "2026-01-10 06:00",
    },
    {
      id: "ALT-MDL-003",
      model: "MDL-003",
      severity: "Medium",
      title: "Precision decline in CNP channel",
      status: "Under assessment",
      owner: "N. Petrov",
      assessment: "Seasonal holiday mix suspected.",
      disposition: "",
      raised: "2026-01-04 06:00",
    },
    {
      id: "ALT-MDL-001",
      model: "MDL-001",
      severity: "Low",
      title: "Calibration gap in top decile",
      status: "Closed",
      owner: "E. Varga",
      assessment: "Within tolerance after recalibration.",
      disposition: "No action — monitor",
      raised: "2025-12-02 06:00",
    },
  ],
  certification: Object.fromEntries(datasets.DATASETS.map((d) => [d.id, d.certification])),
  issues: datasets.QUALITY_ISSUES.map((i) => ({ ...i })),
  accessRequests: [
    {
      id: "AR-031",
      dataset: "DS-003",
      requester: "H. Kim",
      purpose: "Churn feature engineering",
      status: "Pending",
      at: "2026-01-12 09:30",
    },
  ],
  alerts: crime.ALERTS.map((a) => ({ ...a })),
  cases: crime.CASES.map((c) => ({
    ...crime.assessCase(c),
    notes: [...c.notes],
    timeline: [...c.timeline],
  })),
  investigations: investigations.INVESTIGATIONS.map(investigations.assessInvestigation),
  actions: investigations.ACTIONS.map((a) => ({ ...a })),
  audit: [
    {
      id: "AUD-0001",
      at: "2026-01-13 08:02",
      actor: "System",
      module: "Data",
      entity: "DQ-101",
      action: "Rule failed",
      detail: "Reconciliation rule breached on DS-010",
    },
    {
      id: "AUD-0002",
      at: "2026-01-10 06:00",
      actor: "System",
      module: "Models",
      entity: "ALT-MDL-002",
      action: "Alert raised",
      detail: "PSI threshold exceeded on MDL-002",
    },
    {
      id: "AUD-0003",
      at: "2026-01-08 10:12",
      actor: "F. Leclerc",
      module: "Financial Crime",
      entity: "CASE-0917",
      action: "Note added",
      detail: "Investigator note",
    },
    {
      id: "AUD-0004",
      at: "2026-01-06 15:40",
      actor: "A. Haddad",
      module: "Investigations",
      entity: "INV-2025-014",
      action: "Created",
      detail: "Credit revenue vs peers investigation opened",
    },
  ],
};

let seq = 5;
const versions: ReportVersion[] = [];
const reviews: review.Review[] = [];
const refuse = <T>(r: T | string): T => {
  if (typeof r === "string") throw new Error(r);
  return r;
};
// A report is Approved once a reviewer has approved one of its versions, as the database sets it.
const approved = (report: string) =>
  reviews.some((r) => r.report === report && r.decision?.decision === "Approved");
const reviewOf = (id: string, version: number) => {
  const i = reviews.findIndex((r) => r.report === id && r.version === version);
  if (i < 0) throw new Error(`Version ${version} of ${id} is not submitted.`);
  return i;
};
const valid = review.validAction;

async function set(
  fn: (s: State) => Partial<State>,
  audit?: Omit<AuditEvent, "id" | "at" | "actor">,
) {
  state = { ...state, ...fn(state) };
  if (audit) {
    const event = { id: `AUD-${String(seq++).padStart(4, "0")}`, at: now(), actor: USER.name };
    state = { ...state, audit: [{ ...event, ...audit }, ...state.audit] };
  }
}

// Every record the demo serves says it is synthetic.
const tag = <T extends object>(records: readonly T[]) =>
  records.map((r) => ({ ...r, synthetic: true as const }));
const tagOne = <T extends object>(record: T) => ({ ...record, synthetic: true as const });

const describePatch = (patch: object) =>
  Object.entries(patch)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");

export const demoRepo: Repository = {
  environment: "demo",
  session: { read: async () => ({ user: tagOne(USER) }) },
  finance: {
    read: async () => ({
      bank: tagOne(finance.BANK),
      departments: tag(finance.DEPARTMENTS),
      quarterlyRevenue: tag(finance.quarterlyRevenue()),
      scorecard: tagOne(finance.SCORECARD),
      peers: tag(finance.PEERS),
      peerHistory: tag(finance.PEER_HISTORY),
      bridges: tag(finance.BRIDGES),
      peerBenchmarkNote: finance.PEER_BENCHMARK_NOTE,
    }),
  },
  credit: {
    read: async () => ({
      segments: credit.SEGMENTS,
      regions: credit.REGIONS,
      riskBands: credit.RISK_BANDS,
      channels: credit.CHANNELS,
      products: credit.PRODUCTS,
      industries: credit.INDUSTRIES,
      slices: tag(credit.SLICES),
      funnel: tag(credit.FUNNEL),
      rejectionReasons: tag(credit.REJECTION_REASONS),
      stress: tag(credit.STRESS),
      trend: tag(credit.CREDIT_TREND),
    }),
  },
  crime: {
    read: async () => ({
      alerts: tag(state.alerts),
      // The policy sets every evidence state on the way out, whatever an update wrote.
      cases: tag(state.cases.map(crime.assessCase)),
      trend: tag(crime.CRIME_TREND),
      investigators: crime.INVESTIGATORS_LIST,
    }),
    updateAlert: (id, patch) =>
      set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }), {
        module: "Financial Crime",
        entity: id,
        action: "Alert updated",
        detail: describePatch(patch),
      }),
    updateCase: (id, patch, event) =>
      set(
        (s) => ({
          cases: s.cases.map((c) =>
            c.id === id ? { ...c, ...patch, timeline: [...c.timeline, { at: now(), event }] } : c,
          ),
          alerts:
            patch.status || patch.assignee
              ? s.alerts.map((a) =>
                  a.caseId === id
                    ? {
                        ...a,
                        ...(patch.status ? { status: patch.status as AlertStatus } : {}),
                        ...(patch.assignee ? { investigator: patch.assignee } : {}),
                      }
                    : a,
                )
              : s.alerts,
        }),
        { module: "Financial Crime", entity: id, action: "Case updated", detail: event },
      ),
    addCaseNote: (id, text, role) =>
      set(
        (s) => ({
          cases: s.cases.map((c) =>
            c.id === id
              ? {
                  ...c,
                  notes: [...c.notes, { author: USER.name, role, at: now(), text }],
                  timeline: [...c.timeline, { at: now(), event: `${role} note added` }],
                }
              : c,
          ),
        }),
        { module: "Financial Crime", entity: id, action: "Note added", detail: text.slice(0, 80) },
      ),
  },
  datasets: {
    read: async () => ({
      datasets: tag(datasets.DATASETS),
      certification: state.certification,
      lineage: { nodes: tag(datasets.LINEAGE_NODES), edges: datasets.LINEAGE_EDGES },
      issues: tag(state.issues),
      dimensions: tag(datasets.DQ_DIMENSIONS),
      trend: tag(datasets.DQ_TREND),
      glossary: tag(datasets.GLOSSARY),
      accessRequests: tag(state.accessRequests),
    }),
    setCertification: (id, c) =>
      set((s) => ({ certification: { ...s.certification, [id]: c } }), {
        module: "Data",
        entity: id,
        action: "Certification",
        detail: c,
      }),
    updateIssue: (id, patch) =>
      set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, ...patch } : i)) }), {
        module: "Data",
        entity: id,
        action: "Issue updated",
        detail: describePatch(patch),
      }),
    requestAccess: (dataset, purpose) =>
      set(
        (s) => ({
          accessRequests: [
            {
              id: `AR-${String(32 + s.accessRequests.length)}`,
              dataset,
              requester: USER.name,
              purpose,
              status: "Pending",
              at: now(),
            },
            ...s.accessRequests,
          ],
        }),
        { module: "Data", entity: dataset, action: "Access requested", detail: purpose },
      ),
    decideAccess: (id, status) =>
      set(
        (s) => ({
          accessRequests: s.accessRequests.map((r) => (r.id === id ? { ...r, status } : r)),
        }),
        { module: "Data", entity: id, action: "Access decision", detail: status },
      ),
  },
  models: {
    read: async () => ({
      models: tag(models.MODELS),
      lifecycle: state.modelLifecycle,
      selectedVersion: state.modelVersion,
      decisions: tag(state.modelDecisions),
      findingStatus: state.findingStatus,
      driftAlerts: tag(state.driftAlerts),
      driftFeatures: tag(models.DRIFT_FEATURES),
      perfHistory: tag(models.PERF_HISTORY),
      forecast: tag(models.FORECAST_SERIES),
      lgdScatter: tag(models.LGD_SCATTER),
      explanations: Object.fromEntries(EXPLANATIONS.map((e) => [e.model, e])),
      featureImportance: Object.fromEntries(
        EXPLANATIONS.map((e) => [e.model, tag(globalImportance(e))]),
      ),
    }),
    explain: async () => Object.fromEntries(EXPLANATIONS.map((e) => [e.model, e])),
    selectVersion: (model, version) =>
      set((s) => ({ modelVersion: { ...s.modelVersion, [model]: version } })),
    decide: (model, decision, comment) =>
      set(
        (s) => ({
          modelDecisions: [
            { model, decision, by: USER.name, at: now(), comment },
            ...s.modelDecisions,
          ],
          modelLifecycle: {
            ...s.modelLifecycle,
            [model]: decision === "Approved" ? "Production" : "Development",
          },
        }),
        {
          module: "Models",
          entity: model,
          action: `Demo ${decision.toLowerCase()}`,
          detail: comment || "No comment",
        },
      ),
    setFindingStatus: (id, status) =>
      set((s) => ({ findingStatus: { ...s.findingStatus, [id]: status } }), {
        module: "Models",
        entity: id,
        action: "Finding status",
        detail: status,
      }),
    updateDrift: (id, patch) =>
      set(
        (s) => ({
          driftAlerts: s.driftAlerts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }),
        { module: "Models", entity: id, action: "Alert updated", detail: describePatch(patch) },
      ),
  },
  investigations: {
    read: async () => {
      const invs = state.investigations.map((i) => withPolicyStates(i, DEMO_DATE));
      return {
        investigations: tag(invs),
        actions: tag(state.actions),
        reports: tag(
          investigations.REPORTS.map((r) => ({
            ...r,
            status: approved(r.id) ? ("Approved" as const) : r.status,
            state: reportState(
              invs.filter((i) => i.id === r.investigation).map((i) => i.state),
              0,
              approved(r.id),
            ),
          })),
        ),
        nextSteps: tag(investigations.NEXT_STEPS),
      };
    },
    create: async (inv) => {
      refuseUnearnedVerified(inv, DEMO_DATE);
      const assessed = withPolicyStates(inv, DEMO_DATE);
      return set((s) => ({ investigations: [assessed, ...s.investigations] }), {
        module: "Investigations",
        entity: inv.id,
        action: "Created",
        detail: inv.question,
      });
    },
    setStatus: async (id, status) => {
      if (status === "Approved") throw new Error("Approved is set only by an approval.");
      await set(
        (s) => ({
          investigations: s.investigations.map((i) => (i.id === id ? { ...i, status } : i)),
        }),
        { module: "Investigations", entity: id, action: "Status changed", detail: status },
      );
    },
    addAction: (a) =>
      set(
        (s) => ({ actions: [{ ...valid(a), id: `ACT-${101 + s.actions.length}` }, ...s.actions] }),
        {
          module: "Investigations",
          entity: a.finding,
          action: "Action created",
          detail: a.action,
        },
      ),
    updateAction: (id, patch) =>
      set(
        (s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, ...valid(patch) } : a)) }),
        {
          module: "Investigations",
          entity: id,
          action: "Action updated",
          detail: describePatch(patch),
        },
      ),
  },
  reports: {
    read: async () => {
      await seedReview();
      return frozenCopy({ versions, reviews, reviewers: [...investigations.REVIEWERS] });
    },
    save: async (id, snapshot) => {
      await seedReview();
      if (snapshot.report.id !== id)
        throw new Error(`The snapshot is of ${snapshot.report.id}, not ${id}.`);
      refuseUnearnedVerified(snapshot.inv, DEMO_DATE);
      // A sign-off comes only from an approval, and states only from the policy.
      const { signoff: _signoff, ...kept } = snapshot;
      const v = frozenCopy({
        report: id,
        version: versions.filter((x) => x.report === id).length + 1,
        savedAt: now(),
        savedBy: USER.name,
        snapshot: { ...kept, inv: withPolicyStates(kept.inv, DEMO_DATE) },
        synthetic: true as const,
      });
      versions.push(v);
      await set(() => ({}), {
        module: "Reports",
        entity: id,
        action: "Version saved",
        detail: `Version ${v.version}`,
      });
      return v;
    },
    submit: async (id, version, reviewer) => {
      await seedReview();
      const saved = versions
        .filter((v) => v.report === id)
        .map((v) => ({ version: v.version, savedBy: v.savedBy }));
      const r = refuse(
        review.submit(reviews, saved, { report: id, version, reviewer }, USER.name, now()),
      );
      reviews.push({ ...r, synthetic: true });
      await set(() => ({}), {
        module: "Reports",
        entity: id,
        action: "Submitted for review",
        detail: `Version ${version} to ${reviewer}`,
      });
    },
    comment: async (id, version, text) => {
      await seedReview();
      const i = reviewOf(id, version);
      reviews[i] = refuse(review.comment(reviews[i]!, USER.name, text, now()));
      await set(() => ({}), {
        module: "Reports",
        entity: id,
        action: "Review comment",
        detail: text,
      });
    },
    decide: async (id, version, decision, note) => {
      await seedReview();
      const i = reviewOf(id, version);
      reviews[i] = refuse(review.decide(reviews[i]!, USER.name, decision, note, now()));
      await set(() => ({}), {
        module: "Reports",
        entity: id,
        action: `Review ${decision.toLowerCase()}`,
        detail: `Version ${version}${note ? `: ${note}` : ""}`,
      });
    },
  },
  audit: {
    read: async () => tag(state.audit),
    log: (module, entity, action, detail) => set(() => ({}), { module, entity, action, detail }),
    export: async (file, detail) => {
      await set(() => ({}), { module: "Export", entity: file, action: "Exported", detail });
      return true;
    },
  },
};

// The owner's first version of a Pending Review report, built from the data as the demo opens it,
// waiting for the session user's review. Seeded once, by the first call that needs it.
let seeding: Promise<void> | undefined;
function seedReview() {
  return (seeding ??= (async () => {
    const s = investigations.SUBMITTED_REVIEW;
    const { investigations: invs, reports, actions } = await demoRepo.investigations.read();
    const report = reports.find((r) => r.id === s.report)!;
    const snapshot: ReportSnapshot = {
      report,
      inv: invs.find((i) => i.id === report.investigation)!,
      finance: await demoRepo.finance.read(),
      issues: (await demoRepo.datasets.read()).issues,
      actions,
      audit: await demoRepo.audit.read(),
    };
    versions.push(
      frozenCopy({
        report: s.report,
        version: 1,
        savedAt: s.at,
        savedBy: s.submittedBy,
        snapshot,
        synthetic: true as const,
      }),
    );
    reviews.push({ ...s, version: 1, comments: [], synthetic: true });
  })());
}
// Seeded as the demo opens, not on a first read: version 1 holds what the owner saw then, not the
// reviewer's later edits.
void seedReview();
