import { expect, it } from "vitest";

import { clickFirstRow, dialogProblems, setUp } from "./a11y";

setUp();

it("names every button and labels every field in the alert drawer", async () => {
  expect(await dialogProblems("/crime", () => clickFirstRow())).toEqual([]);
});
