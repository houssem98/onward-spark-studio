import { useSyncExternalStore } from "react";
import { MODELS, type Lifecycle } from "@/data/models";
import { DATASETS, QUALITY_ISSUES, type Certification, type QualityIssue } from "@/data/datasets";
import { ALERTS, CASES, type AlertStatus, type CaseRecord, type CrimeAlert } from "@/data/crime";
import { ACTIONS, INVESTIGATIONS, type Action, type Investigation } from "@/data/investigations";

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  module: string;
  entity: string;
  action: string;
  detail: string;
}

export interface DriftAlert {
  id: string;
  model: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  title: string;
  status: "Open" | "Under assessment" | "Closed";
  owner: string;
  assessment: string;
  disposition: string;
  raised: string;
}

export interface AccessRequest {
  id: string;
  dataset: string;
  requester: string;
  purpose: string;
  status: "Pending" | "Approved" | "Rejected";
  at: string;
}

interface State {
  user: { name: string; role: string };
  modelLifecycle: Record<string, Lifecycle>;
  modelDecisions: {
    model: string;
    decision: "Approved" | "Rejected";
    by: string;
    at: string;
    comment: string;
  }[];
  modelVersion: Record<string, string>;
  findingStatus: Record<string, "Open" | "Remediating" | "Closed">;
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
  user: { name: "J. Avery", role: "Chief Risk Officer" },
  modelLifecycle: Object.fromEntries(MODELS.map((m) => [m.id, m.lifecycle])),
  modelDecisions: [
    {
      model: "MDL-002",
      decision: "Approved",
      by: "Model Risk Committee",
      at: "2024-10-15 14:00",
      comment: "Approved v2.4.1 with reference period H1-24.",
    },
  ],
  modelVersion: Object.fromEntries(MODELS.map((m) => [m.id, m.version])),
  findingStatus: Object.fromEntries(MODELS.flatMap((m) => m.findings.map((f) => [f.id, f.status]))),
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
  certification: Object.fromEntries(DATASETS.map((d) => [d.id, d.certification])),
  issues: QUALITY_ISSUES.map((i) => ({ ...i })),
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
  alerts: ALERTS.map((a) => ({ ...a })),
  cases: CASES.map((c) => ({ ...c, notes: [...c.notes], timeline: [...c.timeline] })),
  investigations: INVESTIGATIONS.map((i) => ({ ...i })),
  actions: ACTIONS.map((a) => ({ ...a })),
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

const listeners = new Set<() => void>();
let seq = 5;

function set(fn: (s: State) => Partial<State>, audit?: Omit<AuditEvent, "id" | "at" | "actor">) {
  const patch = fn(state);
  state = { ...state, ...patch };
  if (audit) {
    state = {
      ...state,
      audit: [
        {
          id: `AUD-${String(seq++).padStart(4, "0")}`,
          at: now(),
          actor: state.user.name,
          ...audit,
        },
        ...state.audit,
      ],
    };
  }
  listeners.forEach((l) => l());
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
    () => selector(state),
  );
}

export const getState = () => state;

export const actions = {
  setModelVersion(model: string, version: string) {
    set((s) => ({ modelVersion: { ...s.modelVersion, [model]: version } }));
  },
  decideModel(model: string, decision: "Approved" | "Rejected", comment: string) {
    set(
      (s) => ({
        modelDecisions: [
          { model, decision, by: s.user.name, at: now(), comment },
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
    );
  },
  setFindingStatus(id: string, status: "Open" | "Remediating" | "Closed") {
    set((s) => ({ findingStatus: { ...s.findingStatus, [id]: status } }), {
      module: "Models",
      entity: id,
      action: "Finding status",
      detail: status,
    });
  },
  updateDrift(id: string, patch: Partial<DriftAlert>) {
    set(
      (s) => ({ driftAlerts: s.driftAlerts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }),
      {
        module: "Models",
        entity: id,
        action: "Alert updated",
        detail: Object.entries(patch)
          .map(([k, v]) => `${k}: ${v}`)
          .join("; "),
      },
    );
  },
  setCertification(id: string, c: Certification) {
    set((s) => ({ certification: { ...s.certification, [id]: c } }), {
      module: "Data",
      entity: id,
      action: "Certification",
      detail: c,
    });
  },
  updateIssue(id: string, patch: Partial<QualityIssue>) {
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, ...patch } : i)) }), {
      module: "Data",
      entity: id,
      action: "Issue updated",
      detail: Object.entries(patch)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; "),
    });
  },
  requestAccess(dataset: string, purpose: string) {
    set(
      (s) => ({
        accessRequests: [
          {
            id: `AR-${String(32 + s.accessRequests.length)}`,
            dataset,
            requester: s.user.name,
            purpose,
            status: "Pending",
            at: now(),
          },
          ...s.accessRequests,
        ],
      }),
      {
        module: "Data",
        entity: dataset,
        action: "Access requested",
        detail: purpose,
      },
    );
  },
  decideAccess(id: string, status: "Approved" | "Rejected") {
    set(
      (s) => ({
        accessRequests: s.accessRequests.map((r) => (r.id === id ? { ...r, status } : r)),
      }),
      { module: "Data", entity: id, action: "Access decision", detail: status },
    );
  },
  updateAlert(id: string, patch: Partial<CrimeAlert>) {
    set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }), {
      module: "Financial Crime",
      entity: id,
      action: "Alert updated",
      detail: Object.entries(patch)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; "),
    });
  },
  updateCase(id: string, patch: Partial<CaseRecord>, event: string) {
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
    );
  },
  addCaseNote(id: string, text: string, role: "Investigator" | "Reviewer") {
    set(
      (s) => ({
        cases: s.cases.map((c) =>
          c.id === id
            ? {
                ...c,
                notes: [...c.notes, { author: s.user.name, role, at: now(), text }],
                timeline: [...c.timeline, { at: now(), event: `${role} note added` }],
              }
            : c,
        ),
      }),
      { module: "Financial Crime", entity: id, action: "Note added", detail: text.slice(0, 80) },
    );
  },
  addAction(a: Omit<Action, "id">) {
    set((s) => ({ actions: [{ ...a, id: `ACT-${101 + s.actions.length}` }, ...s.actions] }), {
      module: "Investigations",
      entity: a.finding,
      action: "Action created",
      detail: a.action,
    });
  },
  updateAction(id: string, patch: Partial<Action>) {
    set((s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) }), {
      module: "Investigations",
      entity: id,
      action: "Action updated",
      detail: Object.entries(patch)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; "),
    });
  },
  setInvestigationStatus(id: string, status: Investigation["status"]) {
    set(
      (s) => ({
        investigations: s.investigations.map((i) => (i.id === id ? { ...i, status } : i)),
      }),
      { module: "Investigations", entity: id, action: "Status changed", detail: status },
    );
  },
  createInvestigation(inv: Investigation) {
    set((s) => ({ investigations: [inv, ...s.investigations] }), {
      module: "Investigations",
      entity: inv.id,
      action: "Created",
      detail: inv.question,
    });
  },
  log(module: string, entity: string, action: string, detail: string) {
    set(() => ({}), { module, entity, action, detail });
  },
};
