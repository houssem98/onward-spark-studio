import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { cleanup } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { answer } from "@/lib/copilot";
import { DEFINITIONS, MODEL_METRICS } from "@/lib/definitions";
import { demoRepo } from "@/repo/demo";
import { routeTree } from "@/routeTree.gen";
import { clickTab, open, setUp } from "./a11y";

setUp();

const SAMPLE_PATHS: Record<string, string> = {
  "/crime/$id": "/crime/CASE-0917",
  "/models/$id": "/models/MDL-002",
  "/investigations/$id": "/investigations/INV-2025-014",
  "/reports/$id": "/reports/RPT-FY25-PERF",
};

// A KPI tile is recognised by its definition button, so a tile without an id is still found.
const kpis = () => [...document.querySelectorAll('[aria-label^="Definition of "]')];
const unregistered = (where: string, out: Set<string>) => {
  for (const trigger of kpis()) {
    const id = trigger.closest("[data-definition]")?.getAttribute("data-definition");
    if (!id || !(id in DEFINITIONS)) out.add(`${where}: ${trigger.getAttribute("aria-label")}`);
  }
};

describe("definitions registry", () => {
  it("gives every KPI on every page and tab a registered definition", async () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const paths = Object.keys(router.routesByPath).map((p) => SAMPLE_PATHS[p] ?? p);
    const out = new Set<string>();
    let seen = 0;
    for (const p of paths) {
      await open(p);
      seen += kpis().length;
      unregistered(p, out);
      for (const tab of [...document.querySelectorAll('[role="tab"]')]) {
        await clickTab(tab);
        unregistered(`${p} [${tab.textContent}]`, out);
      }
      cleanup();
    }
    expect([...out]).toEqual([]);
    expect(seen).toBeGreaterThan(40);
  }, 120_000);

  it("names each metric once", () => {
    const labels = Object.values(DEFINITIONS).map((d) => d.label);
    expect(labels.filter((l, i) => labels.indexOf(l) !== i)).toEqual([]);
  });

  it("defines every model metric the inventory records", async () => {
    const { models } = await demoRepo.models.read();
    const keys = new Set(models.flatMap((m) => m.versions.flatMap((v) => Object.keys(v.metrics))));
    expect([...keys].filter((k) => !(k in MODEL_METRICS))).toEqual([]);
  });

  it("states the copilot's figures by definition", async () => {
    const data = {
      finance: await demoRepo.finance.read(),
      models: await demoRepo.models.read(),
      datasets: await demoRepo.datasets.read(),
      crime: await demoRepo.crime.read(),
    };
    for (const q of ["How does credit compare with peers?", "Why did net interest margin fall?"]) {
      const { metrics } = answer(q, data);
      expect(metrics.length, q).toBeGreaterThan(0);
      expect(
        metrics.filter((m) => !("def" in m) || !(m.def in DEFINITIONS)),
        q,
      ).toEqual([]);
    }
  });
});
