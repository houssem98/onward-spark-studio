import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { demoRepo } from "@/repo/demo";

import { open, setUp } from "./a11y";

setUp();

const PATH = "/models/MDL-001?tab=explainability";
const bars = () => [...document.querySelectorAll<HTMLButtonElement>("[data-importance-bar]")];

describe("global importance (L11 T2)", () => {
  it("draws one bar per feature, ranked, at the repository's values, each growing from zero", async () => {
    await open(PATH);
    const rows = (await demoRepo.models.read()).featureImportance["MDL-001"]!;
    expect(bars().map((b) => [b.dataset["feature"], Number(b.dataset["value"])])).toEqual(
      rows.map((r) => [r.feature, r.value]),
    );
    const fills = bars().map((b) => b.querySelector<HTMLElement>("[data-bar-fill]")!);
    expect(fills.map((f) => f.style.width)).toEqual(
      rows.map((r) => `${(r.value / rows[0]!.value) * 100}%`),
    );
    expect(fills.every((f) => f.classList.contains("bar-grow"))).toBe(true);
  });

  it("lets the keyboard reach every bar: focus highlights its table row, activation opens its definition", async () => {
    await open(PATH);
    const { explanations } = await demoRepo.models.read();
    const definitions = explanations["MDL-001"]!.definitions;
    expect(bars().length).toBeGreaterThanOrEqual(5);
    for (const [i, bar] of bars().entries()) {
      expect(bar.tagName).toBe("BUTTON");
      expect(bar).not.toBeDisabled();
      act(() => bar.focus());
      expect(document.activeElement).toBe(bar);
      const tableRows = [...document.querySelectorAll("figure table tbody tr")];
      expect(tableRows.map((r) => r.hasAttribute("data-active"))).toEqual(
        tableRows.map((_, j) => j === i),
      );
      fireEvent.click(bar);
      expect(bar).toHaveAttribute("aria-expanded", "true");
      const region = document.getElementById(bar.getAttribute("aria-controls")!)!;
      expect(region).toHaveTextContent(definitions[bar.dataset["feature"]!]!);
    }
  });

  it("defines every feature it explains", async () => {
    const { explanations } = await demoRepo.models.read();
    for (const e of Object.values(explanations))
      expect(e.features.filter((f) => !(e.definitions[f] ?? "").trim())).toEqual([]);
  });
});
