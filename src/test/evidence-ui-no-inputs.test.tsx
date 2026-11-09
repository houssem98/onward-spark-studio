import { act, fireEvent } from "@testing-library/react";
import { expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

const detail = () => document.querySelector("[data-number-detail]")?.textContent ?? "";

// One route render in its own file: a Radix popover opened in jsdom stalls the route renders after it.
it("says a figure taken straight from its source has no inputs, and promises none (L4 T6e, C18)", async () => {
  await open("/data");
  await act(async () => {
    fireEvent.click(
      document.querySelector('[data-definition="catalogued_datasets"] [data-kpi-value] button')!,
    );
  });
  const d = detail();
  expect(d).toContain("No inputs listed: the figure comes from Data catalog by the formula above.");
  expect(d).not.toContain("not itemised");
});
