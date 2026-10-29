import { fireEvent } from "@testing-library/react";
import { expect, it } from "vitest";

import { dialogProblems, setUp } from "./a11y";

setUp();

it("names every button and labels every field in the phone menu", async () => {
  expect(
    await dialogProblems("/", () =>
      fireEvent.click(document.querySelector('button[aria-label="Open navigation"]')!),
    ),
  ).toEqual([]);
});
