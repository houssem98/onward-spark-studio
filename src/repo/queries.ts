import { queryOptions } from "@tanstack/react-query";

import { demoRepo } from "./demo";

export const repo = demoRepo;

export const financeQuery = queryOptions({
  queryKey: ["finance"],
  queryFn: () => repo.finance.read(),
});
export const creditQuery = queryOptions({
  queryKey: ["credit"],
  queryFn: () => repo.credit.read(),
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
