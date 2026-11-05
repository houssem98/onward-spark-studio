import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { demoRepo } from "@/repo/demo";

import { open, setUp } from "./a11y";

setUp();

const PATH = "/models/MDL-001?tab=explainability";
const swarm = () => document.querySelector<SVGSVGElement>("svg[data-beeswarm]")!;
const frame = () => swarm().closest("figure")!;
const points = () => [...swarm().querySelectorAll<SVGCircleElement>("circle[data-case]")];
const rowsOf = () => [...swarm().querySelectorAll<SVGGElement>("g[data-row]")];
const visible = (g: Element) => g.getAttribute("visibility") !== "hidden";

async function explanation() {
  return (await demoRepo.models.read()).explanations["MDL-001"]!;
}

describe("beeswarm (L11 T4)", () => {
  it("places every point at its contribution on one shared scale, within half a pixel", async () => {
    await open(PATH);
    const e = await explanation();
    const m = Math.max(
      ...e.observations.flatMap((o) => Object.values(o.contributions).map(Math.abs)),
    );
    const x0 = Number(swarm().dataset["x0"]);
    const x1 = Number(swarm().dataset["x1"]);
    expect(x1).toBeGreaterThan(x0);
    expect(points()).toHaveLength(e.observations.length * e.features.length);
    const off = points().flatMap((p) => {
      const o = e.observations.find((x) => x.id === p.dataset["case"])!;
      const c = o.contributions[p.dataset["feature"]!]!;
      const want = x0 + ((c + m) / (2 * m)) * (x1 - x0);
      const cx = Number(p.getAttribute("cx"));
      return Math.abs(cx - want) <= 0.5
        ? []
        : [`${o.id} ${p.dataset["feature"]}: ${cx} vs ${want}`];
    });
    expect(off).toEqual([]);
    // Each point travels once from zero to its place.
    const zero = x0 + (x1 - x0) / 2;
    for (const p of points()) {
      expect(p.classList.contains("point-travel")).toBe(true);
      expect(Number.parseFloat(p.style.getPropertyValue("--from"))).toBeCloseTo(
        zero - Number(p.getAttribute("cx")),
        1,
      );
    }
  });

  it("keeps one row per feature, a legend for the value colours, and one table row per observation", async () => {
    await open(PATH);
    const e = await explanation();
    expect(
      rowsOf()
        .map((g) => g.dataset["row"])
        .sort(),
    ).toEqual([...e.features].sort());
    expect(frame().querySelectorAll("[data-legend] [data-swatch]")).toHaveLength(5);
    expect(frame().querySelector("[data-legend]")).toHaveTextContent("Feature value");
    const tableRows = [...frame().querySelectorAll("table tbody tr")];
    expect(tableRows).toHaveLength(e.observations.length);
    expect(tableRows.map((r) => r.children[0]!.textContent)).toEqual(
      e.observations.map((o) => o.id),
    );
  });

  it("isolates a selected feature's row, and reset restores every row", async () => {
    await open(PATH);
    const e = await explanation();
    const select = frame().querySelector<HTMLSelectElement>('select[aria-label="Feature"]')!;
    const pick = e.features[2]!;
    act(() => fireEvent.change(select, { target: { value: pick } }));
    expect(
      rowsOf()
        .filter(visible)
        .map((g) => g.dataset["row"]),
    ).toEqual([pick]);
    act(() => fireEvent.click(frame().querySelector('[aria-label="Reset features"]')!));
    expect(rowsOf().filter(visible)).toHaveLength(e.features.length);
    expect(select.value).toBe("all");
  });
});
