import { fireEvent } from "@testing-library/react";
import { expect, it } from "vitest";

import { dialogProblems, setUp } from "./a11y";

setUp();

it("names every button and labels every field in the palette", async () => {
  expect(
    await dialogProblems("/", () => fireEvent.keyDown(window, { key: "k", ctrlKey: true })),
  ).toEqual([]);
});
