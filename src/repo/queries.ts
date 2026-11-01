import { queryOptions } from "@tanstack/react-query";

import { productionRepo } from "./production";
import type { Repository } from "./types";

// Fails closed: only an unset, empty or "demo" source serves fixtures. The demo adapter is
// imported on that branch alone, and the build replaces each `import.meta.env.VITE_DATA_SOURCE`
// with its value, so a production build drops the branch and never contains the fixtures.
export const repo: Repository =
  !import.meta.env.VITE_DATA_SOURCE || import.meta.env.VITE_DATA_SOURCE === "demo"
    ? (await import("./demo")).demoRepo
    : productionRepo;

export const financeQuery = queryOptions({
  queryKey: ["finance"],
  queryFn: () => repo.finance.read(),
});
export const creditQuery = queryOptions({
  queryKey: ["credit"],
  queryFn: () => repo.credit.read(),
});
export const crimeQuery = queryOptions({
  queryKey: ["crime"],
  queryFn: () => repo.crime.read(),
});
export const datasetsQuery = queryOptions({
  queryKey: ["datasets"],
  queryFn: () => repo.datasets.read(),
});
export const modelsQuery = queryOptions({
  queryKey: ["models"],
  queryFn: () => repo.models.read(),
});
export const investigationsQuery = queryOptions({
  queryKey: ["investigations"],
  queryFn: () => repo.investigations.read(),
});
