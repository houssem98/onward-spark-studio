import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { repo } from "@/repo/queries";
import type { Repository } from "@/repo/types";

// A domain with no source in this environment reads as empty and is named; any other failure fails.
const connected = <T>(read: Promise<T>) =>
  read.catch((e: unknown) => {
    if (e instanceof Error && /not configured/.test(e.message)) return undefined;
    throw e;
  });

export async function readState(r: Repository = repo) {
  const [session, crime, datasets, models, investigations, audit] = await Promise.all([
    r.session.read(),
    connected(r.crime.read()),
    connected(r.datasets.read()),
    connected(r.models.read()),
    r.investigations.read(),
    r.audit.read(),
  ]);
  return {
    user: session.user,
    unconnected: Object.entries({ crime, datasets, models })
      .filter(([, d]) => !d)
      .map(([name]) => name),
    models: models?.models ?? [],
    modelLifecycle: models?.lifecycle ?? {},
    modelDecisions: models?.decisions ?? [],
    modelVersion: models?.selectedVersion ?? {},
    findingStatus: models?.findingStatus ?? {},
    driftAlerts: models?.driftAlerts ?? [],
    datasets: datasets?.datasets ?? [],
    certification: datasets?.certification ?? {},
    issues: datasets?.issues ?? [],
    accessRequests: datasets?.accessRequests ?? [],
    alerts: crime?.alerts ?? [],
    cases: crime?.cases ?? [],
    investigations: investigations.investigations,
    actions: investigations.actions,
    audit,
  };
}

export type State = Awaited<ReturnType<typeof readState>>;

export const storeQuery = queryOptions({ queryKey: ["store"], queryFn: () => readState() });

// The credit revenue-gap investigation: the earliest Performance one, which the wizard copies.
export const revenueGapInvestigation = (s: State) =>
  s.investigations
    .filter((i) => i.module === "Performance")
    .reduce((a, b) => (b.created < a.created ? b : a));

export function useStore<T>(selector: (s: State) => T): T {
  return selector(useSuspenseQuery(storeQuery).data);
}

// Each write goes to the repository, then every query refetches, so all views agree.
export function useActions() {
  const queryClient = useQueryClient();
  const write =
    <A extends unknown[]>(f: (...args: A) => Promise<void>) =>
    async (...args: A) => {
      await f(...args);
      await queryClient.invalidateQueries();
    };
  return {
    setModelVersion: write(repo.models.selectVersion),
    decideModel: write(repo.models.decide),
    setFindingStatus: write(repo.models.setFindingStatus),
    updateDrift: write(repo.models.updateDrift),
    setCertification: write(repo.datasets.setCertification),
    updateIssue: write(repo.datasets.updateIssue),
    requestAccess: write(repo.datasets.requestAccess),
    decideAccess: write(repo.datasets.decideAccess),
    updateAlert: write(repo.crime.updateAlert),
    updateCase: write(repo.crime.updateCase),
    addCaseNote: write(repo.crime.addCaseNote),
    addAction: write(repo.investigations.addAction),
    updateAction: write(repo.investigations.updateAction),
    setInvestigationStatus: write(repo.investigations.setStatus),
    createInvestigation: write(repo.investigations.create),
    log: write(repo.audit.log),
  };
}
