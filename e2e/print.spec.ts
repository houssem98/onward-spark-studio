import { expect, test } from "@playwright/test";

// Sections are held back only when motion is allowed.
test.use({ contextOptions: { reducedMotion: "no-preference" } });

test("a printed report shows every section, scrolled to or not", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Reached in the app, the report's sections below the first screen wait, hidden, until scrolled to.
  await page.locator('a[href="/reports/RPT-FY25-PERF"]').first().click();
  await expect(page).toHaveURL(/\/reports\/RPT-FY25-PERF$/);
  await expect.poll(() => page.locator('[data-reveal="hidden"]').count()).toBeGreaterThan(0);
  await page.emulateMedia({ media: "print" });
  const faint = await page
    .locator("[data-reveal]")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity).filter((o) => o !== "1"));
  expect(faint).toEqual([]);
});
