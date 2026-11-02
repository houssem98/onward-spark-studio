import { expect, test, type Page } from "@playwright/test";

async function hydrated(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect
    .poll(
      () =>
        page
          .locator("main tr[tabindex='0']")
          .first()
          .evaluate((r) => Object.keys(r).some((k) => k.startsWith("__reactProps"))),
      { timeout: 60_000 },
    )
    .toBe(true);
}

/**
 * Opens a record from its register, then reloads: the drawer must reopen on the same record and
 * its row must be selected and on screen, as a shared or bookmarked link would show it.
 */
async function survivesReload(page: Page, param: string, row: ReturnType<Page["locator"]>) {
  const id = (await row.locator("td").first().textContent())!.trim();
  await row.click();
  await expect(page).toHaveURL(new RegExp(`[?&]${param}=${id}`));
  await expect(page.getByRole("dialog")).toContainText(id);

  await page.reload();
  await expect(page.getByRole("dialog")).toContainText(id);
  const selected = page.locator("main tr[aria-selected='true']");
  await expect(selected).toHaveCount(1);
  await expect(selected.locator("td").first()).toHaveText(id);
  await expect(selected).toBeInViewport();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).not.toHaveURL(new RegExp(`[?&]${param}=`));
  return id;
}

for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height } });

    test("an alert opened from the crime register lives in the URL and stays in view", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await hydrated(page, "/crime");
      // A record past the first page, so reopening it has to bring its page back.
      await page.getByRole("button", { name: "Next" }).click();
      await survivesReload(page, "alert", page.locator("main tr[tabindex='0']").last());
    });

    test("a dataset opened from the catalog lives in the URL and stays in view", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await hydrated(page, "/data");
      const next = page.getByRole("button", { name: "Next" });
      if ((await next.count()) && (await next.isEnabled())) await next.click();
      await survivesReload(page, "dataset", page.locator("main tr[tabindex='0']").last());
    });

    test("a data-quality issue lives in the URL with its tab and stays in view", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await hydrated(page, "/data");
      const tab = page.getByRole("tab", { name: "Data quality" });
      await expect(async () => {
        await tab.click();
        await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
      }).toPass();
      const rows = page.locator("[role=tabpanel] tr[tabindex='0']");
      await survivesReload(page, "issue", rows.last());
    });
  });
}
