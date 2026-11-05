import type { Repository } from "./types";

const notConfigured = async (): Promise<never> => {
  throw new Error("Production data source not configured");
};

export const productionRepo: Repository = {
  environment: "production",
  session: { read: notConfigured },
  finance: { read: notConfigured },
  credit: { read: notConfigured },
  crime: {
    read: notConfigured,
    updateAlert: notConfigured,
    updateCase: notConfigured,
    addCaseNote: notConfigured,
  },
  datasets: {
    read: notConfigured,
    setCertification: notConfigured,
    updateIssue: notConfigured,
    requestAccess: notConfigured,
    decideAccess: notConfigured,
  },
  models: {
    read: notConfigured,
    explain: notConfigured,
    selectVersion: notConfigured,
    decide: notConfigured,
    setFindingStatus: notConfigured,
    updateDrift: notConfigured,
  },
  investigations: {
    read: notConfigured,
    create: notConfigured,
    setStatus: notConfigured,
    addAction: notConfigured,
    updateAction: notConfigured,
  },
  audit: { read: notConfigured, log: notConfigured },
};
