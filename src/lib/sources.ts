import { FRESH_FOR_DAYS } from "@/lib/evidence";

// The live sources the connectors read (L6). Each is read once a quarter, for a filing's period
// end, so each is fresh for a quarter and its grace after its last successful read.
export const SOURCES = [
  {
    id: "tn-filings",
    name: "Bourse de Tunis, listed banks' quarterly indicators",
    freshForDays: FRESH_FOR_DAYS["Quarterly"]!,
  },
  {
    id: "bct-usd",
    name: "BCT daily interbank rate, Dollar US",
    freshForDays: FRESH_FOR_DAYS["Quarterly"]!,
  },
] as const;

export interface Latest {
  lastSuccess?: string | null;
  lastFailure?: { at: string; detail: string } | null;
}

/** Each source with its last success, any later failure, and whether it is fresh. */
export const healthOf = (latest: Record<string, Latest>, now: Date) =>
  SOURCES.map((s) => {
    const l = latest[s.id] ?? {};
    const age = l.lastSuccess ? (now.getTime() - Date.parse(l.lastSuccess)) / 864e5 : null;
    return {
      ...s,
      lastSuccess: l.lastSuccess ?? null,
      lastFailure: l.lastFailure ?? null,
      status: age === null ? "never read" : age <= s.freshForDays ? "fresh" : "stale",
    };
  });
