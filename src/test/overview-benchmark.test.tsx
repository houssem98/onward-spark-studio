import { describe, expect, it } from "vitest";

import { DEFINITIONS, type DefinitionId } from "@/lib/definitions";
import { open, setUp } from "./a11y";

setUp();

// The overview's KPIs at commit ed03090, before L9 T6, and the module page that owns each.
const BEFORE: DefinitionId[] = [
  "operating_income",
  "operating_expenses",
  "cost_to_income",
  "npl_ratio",
  "outstanding_balance",
  "open_crime_alerts",
  "dq_dimension_mean",
  "open_model_alerts",
];
const HOME: Record<string, string> = {
  operating_income: "/performance",
  operating_expenses: "/performance",
  cost_to_income: "/performance",
  npl_ratio: "/credit",
  outstanding_balance: "/credit",
  open_crime_alerts: "/crime",
  dq_dimension_mean: "/data",
  open_model_alerts: "/models",
};

const kpis = () => [...document.querySelectorAll<HTMLElement>("main [data-definition]")];

describe("benchmark overview", () => {
  it("shows 4 to 6 decision KPIs, each stating its unit, period and source", async () => {
    await open("/");
    const shown = kpis();
    expect(shown.length).toBeGreaterThanOrEqual(4);
    expect(shown.length).toBeLessThanOrEqual(6);
    const unframed = shown.flatMap((el) => {
      const d = DEFINITIONS[el.dataset["definition"] as DefinitionId];
      const text = el.textContent ?? "";
      return [d.unit, d.period, d.source]
        .filter((part) => !text.includes(part))
        .map((part) => `${d.label}: ${part}`);
    });
    expect(unframed).toEqual([]);
  });

  it("leads with the needs-attention queue", async () => {
    await open("/");
    const queue = [...document.querySelectorAll("main h2")].find(
      (h) => h.textContent === "Needs attention",
    );
    expect(queue).toBeDefined();
    const first = kpis()[0]!;
    expect(queue!.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders every KPI that left the overview on its module page", async () => {
    await open("/");
    const kept = new Set(kpis().map((el) => el.dataset["definition"]));
    const moved = BEFORE.filter((d) => !kept.has(d));
    const missing: string[] = [];
    for (const def of moved) {
      await open(HOME[def]!);
      if (!document.querySelector(`main [data-definition="${def}"]`))
        missing.push(`${def} on ${HOME[def]}`);
    }
    expect(missing).toEqual([]);
  });
});
