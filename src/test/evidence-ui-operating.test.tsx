import { act, fireEvent } from "@testing-library/react";
import { expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

// One popover in its own file: a second Radix popover opened in jsdom never settles.
it("lists operating income's own formula terms, which add up to the figure shown (L4 T6b C18)", async () => {
  await open("/");
  await act(async () => {
    fireEvent.click(
      document.querySelector('[data-definition="operating_income"] [data-kpi-value] button')!,
    );
  });
  const o = document.querySelector("[data-number-detail]")?.textContent ?? "";
  expect(o).toMatch(/Net interest income: \$[\d,.]+M/);
  expect(o).toMatch(/Non-interest income: \$[\d,.]+M/);
  expect(o).not.toContain("$0.0M");
  const inputs = o.split("Inputs:")[1]!.split("Source:")[0]!;
  const total = [...inputs.matchAll(/: \$([\d,.]+)M/g)]
    .map((m) => Number(m[1]!.replace(/,/g, "")))
    .reduce((s, x) => s + x, 0);
  const shown = document.querySelector(
    '[data-definition="operating_income"] [data-kpi-value]',
  )!.textContent;
  expect(`$${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}M`).toBe(shown);
});
