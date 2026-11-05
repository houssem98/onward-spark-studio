import { expect, test, type Page } from "@playwright/test";

async function hydrated(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main h1")).toHaveCount(1);
  // A control used before hydration does nothing; wait for React to own the page.
  await expect
    .poll(
      () =>
        page
          .locator("main select")
          .first()
          .evaluate((s) => Object.keys(s).some((k) => k.startsWith("__reactProps"))),
      { timeout: 60_000 },
    )
    .toBe(true);
}

const values = (page: Page) =>
  page.locator("main [data-kpi-band] [data-kpi-value]").allTextContents();

async function filterCredit(page: Page) {
  const segment = page.locator("main select").first();
  const option = await segment.locator("option").nth(1).getAttribute("value");
  await segment.selectOption(option!);
}

test.describe("with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test("credit KPIs tween to the values the filter gives", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await hydrated(reduced, "/credit");
    await filterCredit(reduced);
    const expected = await values(reduced);
    await reduced.close();

    await hydrated(page, "/credit");
    const before = await values(page);
    // Record whether any figure splits into a tween while the filter applies.
    await page.evaluate(() => {
      const w = window as unknown as { tweened: boolean };
      w.tweened = false;
      new MutationObserver(() => {
        if (document.querySelector("[data-kpi-value] [aria-hidden]")) w.tweened = true;
      }).observe(document.querySelector("main")!, { subtree: true, childList: true });
    });
    await filterCredit(page);
    await expect(page.locator("[data-kpi-value] [aria-hidden]")).toHaveCount(0);
    // Until the figures land, not for a fixed time (L10 T8, C17).
    await expect.poll(() => values(page)).toEqual(expected);
    const after = await values(page);
    const tweened = await page.evaluate(() => (window as unknown as { tweened: boolean }).tweened);

    console.log(`figures: before ${before.join(" ")} | after ${after.join(" ")}`);
    expect(tweened, "a figure tweened").toBe(true);
    expect(after).not.toEqual(before);
    expect(after).toEqual(expected);
  });
});
