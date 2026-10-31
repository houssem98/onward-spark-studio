import { queryOptions } from "@tanstack/react-query";

import { demoRepo } from "./demo";
import { productionRepo } from "./production";
import type { Repository } from "./types";

export const repo: Repository =
  import.meta.env["VITE_DATA_SOURCE"] === "production" ? productionRepo : demoRepo;

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
