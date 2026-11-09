import { repo } from "@/repo/queries";

export const RELIABILITY = "How reliable is this figure?";

/** The reliability column's words for a row with no class of its own; how a synthetic figure is classed waits on the human (L4 T6c). */
export const reliabilityOf = (source: string) =>
  `${repo.environment === "demo" ? "Synthetic demo figure" : "Not assessed"} · Source: ${source}`;
