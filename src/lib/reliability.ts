import { repo } from "@/repo/queries";

export const RELIABILITY = "How reliable is this figure?";

/** The reliability column's words for a row with no class of its own; the demo's figures are the synthetic class (L4 T6c). */
export const reliabilityOf = (source: string) =>
  `${repo.environment === "demo" ? "Synthetic, illustrative" : "Not assessed"} · Source: ${source}`;
