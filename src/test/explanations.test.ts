import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { demoRepo } from "@/repo/demo";
import { productionRepo } from "@/repo/production";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("model explanations (L11 T1)", () => {
  it("serves explanations for the two credit models, at their production versions, through the demo repository", async () => {
    const { models, explanations } = await demoRepo.models.read();
    expect(Object.keys(explanations).sort()).toEqual(["MDL-001", "MDL-002"]);
    for (const e of Object.values(explanations)) {
      expect(e.version).toBe(models.find((m) => m.id === e.model)?.version);
      expect(e.scale).toBe("log-odds");
      expect(e.observations.length).toBeGreaterThanOrEqual(30);
      for (const o of e.observations)
        expect(Object.keys(o.contributions).sort()).toEqual([...e.features].sort());
    }
  });

  it("reconciles: the baseline plus the contributions equals the output at 4 dp, for every observation", async () => {
    const { explanations } = await demoRepo.models.read();
    const off = Object.values(explanations).flatMap((e) =>
      e.observations
        .filter(
          (o) => Math.abs(e.baseline + sum(Object.values(o.contributions)) - o.output) >= 0.00005,
        )
        .map((o) => `${e.model} ${o.id}: ${e.baseline} + Σ ≠ ${o.output}`),
    );
    expect(off).toEqual([]);
  });

  it("marks every explanation and every observation synthetic", async () => {
    const { explanations } = await demoRepo.models.read();
    for (const e of Object.values(explanations)) {
      expect(e.synthetic).toBe(true);
      expect(e.observations.every((o) => o.synthetic === true)).toBe(true);
    }
  });

  it("derives global importance as the mean absolute contribution over the same rows, for those models only", async () => {
    const { explanations, featureImportance } = await demoRepo.models.read();
    expect(Object.keys(featureImportance).sort()).toEqual(Object.keys(explanations).sort());
    for (const e of Object.values(explanations)) {
      const expected = e.features
        .map((f) => ({
          feature: f,
          value:
            Math.round(
              (sum(e.observations.map((o) => Math.abs(o.contributions[f]!))) /
                e.observations.length) *
                10_000,
            ) / 10_000,
        }))
        .sort((a, b) => b.value - a.value);
      expect(featureImportance[e.model]).toEqual(expected.map((r) => ({ ...r, synthetic: true })));
    }
  });

  it("is seeded: the fixture draws no randomness or clock of its own", () => {
    const src = readFileSync("src/data/explanations.ts", "utf8");
    expect(src).not.toMatch(/Math\.random|Date\.now|new Date|performance\.now/);
  });

  it("answers unavailable in production", async () => {
    await expect(productionRepo.models.read()).rejects.toThrow("not configured");
  });
});
