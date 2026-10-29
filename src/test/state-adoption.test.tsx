import { act, fireEvent } from "@testing-library/react";
import { expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

const select = (label: string) =>
  [...document.querySelectorAll("label")]
    .find((l) => l.firstElementChild?.textContent === label)!
    .querySelector("select")!;

it("shows the empty state, not a 0.00% ratio, when no credit slice matches the filters", async () => {
  await open("/credit");
  // Corporate loans only ever use the Relationship channel, so this pair matches nothing.
  await act(async () => {
    fireEvent.change(select("Segment"), { target: { value: "Corporate" } });
  });
  await act(async () => {
    fireEvent.change(select("Channel"), { target: { value: "Digital" } });
  });
  const text = document.querySelector("main")!.textContent!;
  expect(text).toMatch(/0 portfolio slices/);
  expect(text).toMatch(/No portfolio slices for this selection/);
  expect(text).not.toMatch(/0\.00%/);
});
