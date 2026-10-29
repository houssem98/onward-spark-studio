import { expect, it } from "vitest";

import { clickFirstRow, dialogProblems, setUp } from "./a11y";

setUp();

it("names every button and labels every field in the dataset drawer", async () => {
  expect(await dialogProblems("/data", () => clickFirstRow())).toEqual([]);
});
