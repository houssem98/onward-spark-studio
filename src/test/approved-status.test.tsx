import { expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

// Only a recorded approval makes work Approved (L3 T8c), so the status control never offers it.
it("the investigation status control offers every status but Approved", async () => {
  await open("/investigations/INV-2025-014");
  const select = document.querySelector<HTMLSelectElement>('select[aria-label="Status"]');
  expect(select).not.toBeNull();
  const offered = [...select!.options].filter((o) => !o.disabled).map((o) => o.value);
  expect(offered).toEqual(["Draft", "In Progress", "Pending Review", "Closed"]);
});
