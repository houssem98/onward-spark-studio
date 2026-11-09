import { act, fireEvent, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

const detail = () => document.querySelector("[data-number-detail]")?.textContent ?? "";
const click = async (def: string) =>
  act(async () => {
    fireEvent.click(document.querySelector(`[data-definition="${def}"] [data-kpi-value] button`)!);
  });
const shown = (def: string) =>
  document.querySelector(`[data-definition="${def}"] [data-kpi-value]`)!.textContent!;
const amounts = (text: string) =>
  [...text.matchAll(/: \$([\d,.]+)M/g)].map((m) => Number(m[1]!.replace(/,/g, "")));

// One route render in its own file: a Radix popover opened in jsdom stalls the route renders after it.
it("opens a number's definition, formula, inputs and source when it is clicked (L4 T5, T6b)", async () => {
  await open("/");
  expect(detail()).toBe("");
  await click("cost_to_income");
  const d = detail();
  expect(d).toContain("Operating expenses as a share of operating income.");
  expect(d).toContain("Formula: Operating expenses ÷ operating income × 100");
  expect(d).toMatch(/Inputs:Operating expenses: \$[\d,.]+MOperating income: \$[\d,.]+M/);
  expect(d).toContain("Source: DS-009 Finance reporting");
  // C27: the popover is named; C23: its inputs reproduce the number shown.
  expect(
    screen.getByRole("dialog", { name: "Cost-to-income: definition, formula, inputs and source" }),
  ).toBeDefined();
  const [opex, income] = amounts(d.split("Inputs:")[1]!);
  expect(`${((opex! / income!) * 100).toFixed(1)}%`).toBe(shown("cost_to_income"));
});
