import { z } from "zod";

import type { Dataset } from "@/data/datasets";
import type { Peer, SourceType } from "@/data/finance";
import { DEFINITIONS, type DefinitionId } from "@/lib/definitions";

export const EVIDENCE_STATES = [
  "VERIFIED",
  "PARTIALLY_VERIFIED",
  "UNVERIFIED",
  "CONFLICTING_EVIDENCE",
  "NOT_AVAILABLE",
  "DRAFT",
  "HYPOTHESIS",
] as const;
export const EvidenceStateSchema = z.enum(EVIDENCE_STATES);
export type EvidenceState = z.infer<typeof EvidenceStateSchema>;

// Which findings a page lists beside its contradictions, and which beside its gaps.
export const SHOWN_WITH = {
  contradictions: ["CONFLICTING_EVIDENCE"],
  gaps: ["PARTIALLY_VERIFIED", "UNVERIFIED", "NOT_AVAILABLE", "HYPOTHESIS", "DRAFT"],
} satisfies Record<string, EvidenceState[]>;

const text = z.string().trim().min(1);
const isoDate = z.string().date();

export const SourceSchema = z
  .object({
    id: text,
    name: text,
    authority: z.enum(["regulatory", "audited", "internal", "third_party", "synthetic"]),
    entity: text,
    period: text,
    asOf: isoDate,
    freshForDays: z.number().int().positive(),
    unit: text,
    licence: text,
    version: text,
    /** Set for a catalog dataset: whether it is certified. */
    certified: z.boolean().optional(),
  })
  .strict();
export type Source = z.infer<typeof SourceSchema>;

export const DEMO_ENTITY = "Northstar Bank (fictional)";

// A source stays fresh for one refresh cycle plus a day's grace.
export const FRESH_FOR_DAYS: Record<string, number> = {
  Hourly: 1,
  "Streaming (batch replica)": 1,
  Daily: 2,
  Weekly: 8,
  Monthly: 35,
  Quarterly: 100,
};

export const demoSource = (
  s: Pick<Source, "id" | "name" | "authority" | "period" | "asOf" | "freshForDays" | "unit">,
): Source => ({
  ...s,
  entity: DEMO_ENTITY,
  licence: "Synthetic demo data",
  version: s.asOf,
});

/**
 * A catalog dataset as the source of a figure in `unit` for a claim about `period`; `asOf`
 * overrides its last refresh. Entity, coverage and certification are the dataset's own, so a
 * dataset that does not hold the period says what it does hold, and the scope rule can fail.
 */
export const sourceOf = (
  d: Dataset,
  period: string,
  unit: string,
  asOf = d.lastRefresh.slice(0, 10),
): Source => ({
  ...demoSource({
    id: d.id,
    name: `${d.id} ${d.name}`,
    authority: d.authority ?? "internal",
    period:
      d.coverage === "continuous" || d.coverage.includes(period) ? period : d.coverage.join(", "),
    asOf,
    freshForDays: FRESH_FOR_DAYS[d.frequency] ?? 1,
    unit,
  }),
  entity: d.entity,
  certified: d.certification === "Certified",
});

const METRIC_IDS = Object.keys(DEFINITIONS) as [DefinitionId, ...DefinitionId[]];

export const ClaimSchema = z
  .object({
    id: text,
    text,
    kind: z.enum(["measured", "hypothesis"]),
    metricId: z.enum(METRIC_IDS).optional(),
  })
  .strict()
  .refine((c) => c.kind === "hypothesis" || c.metricId !== undefined, {
    message: "A measured claim names its metric from the definitions registry",
    path: ["metricId"],
  });
export type Claim = z.infer<typeof ClaimSchema>;

export const CalculationSchema = z
  .object({
    id: text,
    formula: text,
    inputs: z
      .array(
        z.object({ name: text, value: z.number().finite(), unit: text, sourceId: text }).strict(),
      )
      .min(1),
    output: z.object({ value: z.number().finite(), unit: text }).strict(),
  })
  .strict();
export type Calculation = z.infer<typeof CalculationSchema>;

export const EvidenceLinkSchema = z
  .object({ claimId: text, sourceId: text, calculationId: text.optional() })
  .strict();
export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>;

// How far to trust the number itself. Only a confirmed figure is a point value; an estimate is a
// named estimator's range; a not-disclosed or unavailable figure carries no number at all.
export const FigureSchema = z
  .discriminatedUnion("reliability", [
    z
      .object({
        reliability: z.literal("confirmed"),
        value: z.number().finite(),
        unit: text,
        sourceId: text,
        asOf: isoDate,
      })
      .strict(),
    // Synthetic or illustrative: a value to read, never confirmed, dated by its period alone.
    z
      .object({
        reliability: z.literal("synthetic"),
        value: z.number().finite(),
        unit: text,
        sourceId: text,
        period: text,
      })
      .strict(),
    z
      .object({
        reliability: z.literal("third_party_estimate"),
        estimator: text,
        low: z.number().finite(),
        high: z.number().finite(),
        unit: text,
        asOf: isoDate,
      })
      .strict(),
    z
      .object({
        reliability: z.literal("not_disclosed"),
        disclosedInstead: text,
        whyDifferent: text,
      })
      .strict(),
    z.object({ reliability: z.literal("unavailable"), reason: text }).strict(),
  ])
  .refine((f) => f.reliability !== "third_party_estimate" || f.low < f.high, {
    message: "An estimate's range runs from low to high",
    path: ["low"],
  });
export type Figure = z.infer<typeof FigureSchema>;

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** A figure's reliability class in plain words, the format the human supplied on 2026-10-28. */
export function describeFigure(f: Figure): string {
  switch (f.reliability) {
    case "confirmed":
      return `Confirmed: ${f.sourceId}, as of ${day(f.asOf)}`;
    case "synthetic":
      return `Synthetic, illustrative: ${f.sourceId}, ${f.period} (synthetic)`;
    case "third_party_estimate":
      return `Estimate by ${f.estimator}: ${f.low} to ${f.high} ${f.unit}, as of ${day(f.asOf)}`;
    case "not_disclosed":
      return `Not disclosed. Disclosed instead: ${f.disclosedInstead}. Not the same figure: ${f.whyDifferent}`;
    case "unavailable":
      return `No reliable figure: ${f.reason}`;
  }
}

const SOURCE_WORDS: Record<SourceType, string> = {
  PUBLIC_DISCLOSURE: "public disclosure",
  LICENSED: "licensed data",
  INTERNAL: "internal figures",
  NOT_AVAILABLE: "no permitted source",
};

/**
 * A bank's figure for one metric as a reliability class. A figure from a real filing is dated at
 * its fiscal year end; a synthetic or illustrative one is its own class, dated by its period alone.
 */
export function peerFigure(
  p: Pick<Peer, "name" | "period" | "source" | "warning" | "notDisclosed" | "synthetic">,
  value: number | null,
  unit: string,
): Figure {
  if (p.source === "NOT_AVAILABLE")
    return { reliability: "unavailable", reason: p.warning ?? "No permitted source." };
  if (p.notDisclosed)
    return {
      reliability: "not_disclosed",
      disclosedInstead: p.notDisclosed.instead,
      whyDifferent: p.notDisclosed.why,
    };
  const year = /^FY(\d{4})$/.exec(p.period)?.[1];
  if (value === null || !year)
    return {
      reliability: "unavailable",
      reason: `${p.name}'s ${p.period} ${SOURCE_WORDS[p.source]} does not give it.`,
    };
  const sourceId = `${p.name} ${p.period} ${SOURCE_WORDS[p.source]}`;
  if (p.synthetic) return { reliability: "synthetic", value, unit, sourceId, period: p.period };
  return {
    reliability: "confirmed",
    value,
    unit,
    sourceId,
    asOf: `${year}-12-31`,
  };
}
