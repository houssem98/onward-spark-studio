import * as credit from "@/data/credit";
import * as crime from "@/data/crime";
import * as datasets from "@/data/datasets";
import * as finance from "@/data/finance";
import * as investigations from "@/data/investigations";
import * as models from "@/data/models";
import { actions, getState } from "@/store/app-store";
import type { Repository } from "./types";

// Mutable demo state stays in the store until L2 T4 moves it behind this adapter.
const write =
  <A extends unknown[]>(f: (...args: A) => void) =>
  async (...args: A) =>
    f(...args);

export const demoRepo: Repository = {
  finance: {
    read: async () => ({
      bank: finance.BANK,
      departments: finance.DEPARTMENTS,
      quarterlyRevenue: finance.quarterlyRevenue(),
      scorecard: finance.SCORECARD,
      peers: finance.PEERS,
      peerHistory: finance.PEER_HISTORY,
      bridges: finance.BRIDGES,
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
      slices: credit.SLICES,
      funnel: credit.FUNNEL,
      rejectionReasons: credit.REJECTION_REASONS,
      stress: credit.STRESS,
      trend: credit.CREDIT_TREND,
    }),
  },
  crime: {
    read: async () => {
      const s = getState();
      return {
        alerts: s.alerts,
        cases: s.cases,
        trend: crime.CRIME_TREND,
        investigators: crime.INVESTIGATORS_LIST,
      };
    },
    updateAlert: write(actions.updateAlert),
    updateCase: write(actions.updateCase),
    addCaseNote: write(actions.addCaseNote),
  },
  datasets: {
    read: async () => {
      const s = getState();
      return {
        datasets: datasets.DATASETS,
        certification: s.certification,
        lineage: { nodes: datasets.LINEAGE_NODES, edges: datasets.LINEAGE_EDGES },
        issues: s.issues,
        dimensions: datasets.DQ_DIMENSIONS,
        trend: datasets.DQ_TREND,
        glossary: datasets.GLOSSARY,
        accessRequests: s.accessRequests,
      };
    },
    setCertification: write(actions.setCertification),
    updateIssue: write(actions.updateIssue),
    requestAccess: write(actions.requestAccess),
    decideAccess: write(actions.decideAccess),
  },
  models: {
    read: async () => {
      const s = getState();
      return {
        models: models.MODELS,
        lifecycle: s.modelLifecycle,
        selectedVersion: s.modelVersion,
        decisions: s.modelDecisions,
        findingStatus: s.findingStatus,
        driftAlerts: s.driftAlerts,
        driftFeatures: models.DRIFT_FEATURES,
        perfHistory: models.PERF_HISTORY,
        forecast: models.FORECAST_SERIES,
        lgdScatter: models.LGD_SCATTER,
        featureImportance: models.FEATURE_IMPORTANCE,
      };
    },
    selectVersion: write(actions.setModelVersion),
    decide: write(actions.decideModel),
    setFindingStatus: write(actions.setFindingStatus),
    updateDrift: write(actions.updateDrift),
  },
  investigations: {
    read: async () => {
      const s = getState();
      return {
        investigations: s.investigations,
        actions: s.actions,
        reports: investigations.REPORTS,
        nextSteps: investigations.NEXT_STEPS,
      };
    },
    create: write(actions.createInvestigation),
    setStatus: write(actions.setInvestigationStatus),
    addAction: write(actions.addAction),
    updateAction: write(actions.updateAction),
  },
  audit: {
    read: async () => getState().audit,
    log: write(actions.log),
  },
};
