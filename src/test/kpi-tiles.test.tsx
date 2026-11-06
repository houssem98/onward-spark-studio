import { describe, expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

const tiles = () => [...document.querySelectorAll<HTMLElement>("[data-definition]")];

describe("KPI tiles are numbers (L12 T2)", () => {
  it.each(["/", "/credit", "/performance"])("holds no drawing in a tile on %s", async (path) => {
    await open(path);
    expect(tiles().length).toBeGreaterThan(3);
    const drawn = tiles()
      .filter((t) =>
        [...t.querySelectorAll("svg")].some((s) => !s.closest('[aria-label^="Definition of"]')),
      )
      .map((t) => t.dataset["definition"]);
    expect(drawn).toEqual([]);
  });

  it.each([
    ["/", 2],
    ["/credit", 3],
    ["/performance", 5],
  ] as const)("names what each change compares to on %s", async (path, least) => {
    await open(path);
    const changes = [...document.querySelectorAll<HTMLElement>("[data-kpi-delta]")];
    expect(changes.length).toBeGreaterThanOrEqual(least);
    const unnamed = changes
      .filter(
        (c) =>
          !/^vs \S/.test(c.dataset["versus"] ?? "") ||
          !c.textContent?.includes(c.dataset["versus"]!),
      )
      .map((c) => c.textContent);
    expect(unnamed).toEqual([]);
  });
});
