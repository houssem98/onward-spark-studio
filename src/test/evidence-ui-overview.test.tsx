import { act, fireEvent } from "@testing-library/react";
import { expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

// One test in its own file: a Radix popover opened in jsdom stalls the route renders after it.
it("opens a number's definition, formula, inputs and source when it is clicked (L4 T5)", async () => {
  await open("/");
  const detail = () => document.querySelector("[data-number-detail]")?.textContent ?? "";
  expect(detail()).toBe("");
  await act(async () => {
    fireEvent.click(
      document.querySelector('[data-definition="cost_to_income"] [data-kpi-value] button')!,
    );
  });
  const d = detail();
  expect(d).toContain("Operating expenses as a share of operating income.");
  expect(d).toContain("Formula: Operating expenses ÷ operating income × 100");
  expect(d).toMatch(/Inputs:Operating expenses: \$[\d,.]+MOperating income: \$[\d,.]+M/);
  expect(d).toContain("Source: DS-009 Finance reporting");
});
