import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { repo } from "@/repo/queries";

async function readState() {
  const [session, crime, datasets, models, investigations, audit] = await Promise.all([
    repo.session.read(),
    repo.crime.read(),
    repo.datasets.read(),
    repo.models.read(),
    repo.investigations.read(),
    repo.audit.read(),
  ]);
  return {
    user: session.user,
    models: models.models,
    modelLifecycle: models.lifecycle,
    modelDecisions: models.decisions,
    modelVersion: models.selectedVersion,
    findingStatus: models.findingStatus,
    driftAlerts: models.driftAlerts,
    datasets: datasets.datasets,
    certification: datasets.certification,
    issues: datasets.issues,
    accessRequests: datasets.accessRequests,
    alerts: crime.alerts,
    cases: crime.cases,
    investigations: investigations.investigations,
    actions: investigations.actions,
    audit,
  };
}

export type State = Awaited<ReturnType<typeof readState>>;

export const storeQuery = queryOptions({ queryKey: ["store"], queryFn: readState });

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
