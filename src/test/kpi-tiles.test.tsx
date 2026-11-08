import { describe, expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

const tiles = () => [...document.querySelectorAll<HTMLElement>("[data-definition]")];
const DRAWN =
  "svg, canvas, img, picture, video, progress, meter, [role=img], [role=progressbar], [role=meter], [style*='width']";

describe("KPI tiles are numbers (L12 T2, T6)", () => {
  it.each([
    ["/", 3],
    ["/credit", 3],
    ["/performance", 3],
    ["/crime", 0],
    ["/models", 0],
    ["/models/MDL-001?tab=performance", 0],
    ["/data", 0],
  ] as const)("holds no drawing in a tile on %s", async (path, fewest) => {
    await open(path);
    expect(tiles().length).toBeGreaterThan(fewest);
    const drawn = tiles()
      .filter((t) =>
        [...t.querySelectorAll(DRAWN)].some((s) => !s.closest('[aria-label^="Definition of"]')),
      )
      .map((t) => t.dataset["definition"]);
    expect(drawn).toEqual([]);
  });

  // Finance and scorecard priors are FY2024, credit's prior balance is the year before, stress is set against Baseline.
  it.each([
    ["/", { operating_income: "vs FY2024", cost_to_income: "vs FY2024" }],
    [
      "/credit",
      {
        outstanding_balance: "vs prior year",
        stressed_ecl: "vs Baseline",
        stressed_npl_ratio: "vs Baseline",
      },
    ],
    [
      "/performance",
      {
        operating_income: "vs FY2024",
        net_interest_income: "vs FY2024",
        nim: "vs FY2024",
        non_interest_income: "vs FY2024",
        operating_expenses: "vs FY2024",
      },
    ],
    ["/crime", {}],
    ["/models", {}],
    ["/models/MDL-001?tab=performance", {}],
    ["/data", {}],
  ] as const)("names what each change compares to on %s", async (path, expected) => {
    await open(path);
    const changes = [...document.querySelectorAll<HTMLElement>("[data-kpi-delta]")];
    expect(changes.length).toBe(Object.keys(expected).length);
    const named = Object.fromEntries(
      changes.map((c) => [
        c.closest<HTMLElement>("[data-definition]")?.dataset["definition"] ?? "?",
        c.textContent?.trim().endsWith(` ${c.dataset["versus"]}`)
          ? c.dataset["versus"]
          : `unnamed: ${c.textContent}`,
      ]),
    );
    expect(named).toEqual(expected);
  });
});
