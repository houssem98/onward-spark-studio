import { z } from "zod";

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
  })
  .strict();
export type Source = z.infer<typeof SourceSchema>;

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
      .array(z.object({ name: text, value: z.number(), unit: text, sourceId: text }).strict())
      .min(1),
    output: z.object({ value: z.number(), unit: text }).strict(),
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
        value: z.number(),
        unit: text,
        sourceId: text,
        asOf: isoDate,
      })
      .strict(),
    z
      .object({
        reliability: z.literal("third_party_estimate"),
        estimator: text,
        low: z.number(),
        high: z.number(),
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
  .refine((f) => f.reliability !== "third_party_estimate" || f.low <= f.high, {
    message: "An estimate's range runs from low to high",
    path: ["low"],
  });
export type Figure = z.infer<typeof FigureSchema>;
