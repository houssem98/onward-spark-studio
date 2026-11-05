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
  cases: crime.CASES.map((c) => ({ ...c, notes: [...c.notes], timeline: [...c.timeline] })),
  investigations: investigations.INVESTIGATIONS.map((i) => ({ ...i })),
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
      cases: tag(state.cases),
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
    read: async () => ({
      investigations: tag(state.investigations),
      actions: tag(state.actions),
      reports: tag(investigations.REPORTS),
      nextSteps: tag(investigations.NEXT_STEPS),
    }),
    create: (inv) =>
      set((s) => ({ investigations: [inv, ...s.investigations] }), {
        module: "Investigations",
        entity: inv.id,
        action: "Created",
        detail: inv.question,
      }),
    setStatus: (id, status) =>
      set(
        (s) => ({
          investigations: s.investigations.map((i) => (i.id === id ? { ...i, status } : i)),
        }),
        { module: "Investigations", entity: id, action: "Status changed", detail: status },
      ),
    addAction: (a) =>
      set((s) => ({ actions: [{ ...a, id: `ACT-${101 + s.actions.length}` }, ...s.actions] }), {
        module: "Investigations",
        entity: a.finding,
        action: "Action created",
        detail: a.action,
      }),
    updateAction: (id, patch) =>
      set((s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) }), {
        module: "Investigations",
        entity: id,
        action: "Action updated",
        detail: describePatch(patch),
      }),
  },
  audit: {
    read: async () => tag(state.audit),
    log: (module, entity, action, detail) => set(() => ({}), { module, entity, action, detail }),
  },
};
