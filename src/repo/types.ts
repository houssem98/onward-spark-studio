import type * as credit from "@/data/credit";
import type * as crime from "@/data/crime";
import type * as datasets from "@/data/datasets";
import type * as finance from "@/data/finance";
import type * as investigations from "@/data/investigations";
import type * as models from "@/data/models";
import type { Bridge } from "@/lib/calc";

export interface User {
  name: string;
  role: string;
}

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

export interface ModelDecision {
  model: string;
  decision: "Approved" | "Rejected";
  by: string;
  at: string;
  comment: string;
}

export type FindingStatus = "Open" | "Remediating" | "Closed";

/** One explained observation: its feature values and SHAP contributions, which sum with the
 *  baseline to the model's output. */
export interface ExplainedObservation {
  id: string;
  values: Record<string, number>;
  contributions: Record<string, number>;
  output: number;
  synthetic: true;
}

/** SHAP explanations of one model version, on the model's output scale (log-odds for the credit
 *  classifiers; a probability is only ever a labeled conversion of the output). */
export interface ModelExplanation {
  model: string;
  version: string;
  scale: "log-odds";
  baseline: number;
  features: string[];
  /** What each feature measures, in plain words. */
  definitions: Record<string, string>;
  observations: ExplainedObservation[];
  source: string;
  synthetic: true;
}

export type FeatureImportance = { feature: string; value: number };

// A read resolves to a snapshot of one domain; a write resolves once the change is stored.
export interface FinanceData {
  bank: typeof finance.BANK;
  departments: finance.Department[];
  quarterlyRevenue: ReturnType<typeof finance.quarterlyRevenue>;
  scorecard: typeof finance.SCORECARD;
  peers: finance.Peer[];
  peerHistory: typeof finance.PEER_HISTORY;
  bridges: Bridge[];
  peerBenchmarkNote: string;
}

export interface CreditData {
  segments: typeof credit.SEGMENTS;
  regions: typeof credit.REGIONS;
  riskBands: typeof credit.RISK_BANDS;
  channels: typeof credit.CHANNELS;
  products: typeof credit.PRODUCTS;
  industries: typeof credit.INDUSTRIES;
  slices: credit.Slice[];
  funnel: typeof credit.FUNNEL;
  rejectionReasons: typeof credit.REJECTION_REASONS;
  stress: typeof credit.STRESS;
  trend: typeof credit.CREDIT_TREND;
}

export interface CrimeData {
  alerts: crime.CrimeAlert[];
  cases: crime.CaseRecord[];
  trend: typeof crime.CRIME_TREND;
  investigators: typeof crime.INVESTIGATORS_LIST;
}

export interface DatasetsData {
  datasets: datasets.Dataset[];
  certification: Record<string, datasets.Certification>;
  lineage: { nodes: datasets.LineageNode[]; edges: [string, string][] };
  issues: datasets.QualityIssue[];
  dimensions: typeof datasets.DQ_DIMENSIONS;
  trend: typeof datasets.DQ_TREND;
  glossary: typeof datasets.GLOSSARY;
  accessRequests: AccessRequest[];
}

export interface ModelsData {
  models: models.Model[];
  lifecycle: Record<string, models.Lifecycle>;
  selectedVersion: Record<string, string>;
  decisions: ModelDecision[];
  findingStatus: Record<string, FindingStatus>;
  driftAlerts: DriftAlert[];
  driftFeatures: typeof models.DRIFT_FEATURES;
  perfHistory: typeof models.PERF_HISTORY;
  forecast: typeof models.FORECAST_SERIES;
  lgdScatter: typeof models.LGD_SCATTER;
  explanations: Record<string, ModelExplanation>;
  /** Mean absolute SHAP per feature over `explanations`, for the models that have them. */
  featureImportance: Record<string, FeatureImportance[]>;
}

export interface InvestigationsData {
  investigations: investigations.Investigation[];
  actions: investigations.Action[];
  reports: typeof investigations.REPORTS;
  nextSteps: typeof investigations.NEXT_STEPS;
}

export interface Repository {
  environment: "demo" | "production";
  session: { read(): Promise<{ user: User }> };
  finance: { read(): Promise<FinanceData> };
  credit: { read(): Promise<CreditData> };
  crime: {
    read(): Promise<CrimeData>;
    updateAlert(id: string, patch: Partial<crime.CrimeAlert>): Promise<void>;
    updateCase(id: string, patch: Partial<crime.CaseRecord>, event: string): Promise<void>;
    addCaseNote(id: string, text: string, role: "Investigator" | "Reviewer"): Promise<void>;
  };
  datasets: {
    read(): Promise<DatasetsData>;
    setCertification(id: string, c: datasets.Certification): Promise<void>;
    updateIssue(id: string, patch: Partial<datasets.QualityIssue>): Promise<void>;
    requestAccess(dataset: string, purpose: string): Promise<void>;
    decideAccess(id: string, status: "Approved" | "Rejected"): Promise<void>;
  };
  models: {
    read(): Promise<ModelsData>;
    selectVersion(model: string, version: string): Promise<void>;
    decide(model: string, decision: "Approved" | "Rejected", comment: string): Promise<void>;
    setFindingStatus(id: string, status: FindingStatus): Promise<void>;
    updateDrift(id: string, patch: Partial<DriftAlert>): Promise<void>;
  };
  investigations: {
    read(): Promise<InvestigationsData>;
    create(inv: investigations.Investigation): Promise<void>;
    setStatus(id: string, status: investigations.InvStatus): Promise<void>;
    addAction(a: Omit<investigations.Action, "id">): Promise<void>;
    updateAction(id: string, patch: Partial<investigations.Action>): Promise<void>;
  };
  audit: {
    read(): Promise<AuditEvent[]>;
    log(module: string, entity: string, action: string, detail: string): Promise<void>;
  };
}
