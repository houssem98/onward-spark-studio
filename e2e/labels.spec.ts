import { readdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SAMPLE: Record<string, string> = {
  "crime.$id": "CASE-0917",
  "investigations.$id": "INV-2025-014",
  "models.$id": "MDL-002",
  "reports.$id": "RPT-FY25-PERF",
};
const ROUTES = readdirSync("src/routes")
  .filter((f) => f.endsWith(".tsx") && f !== "__root.tsx")
  .map((f) => f.slice(0, -".tsx".length));
const pathOf = (route: string) =>
  "/" +
  route
    .split(".")
    .filter((s) => s !== "index")
    .map((s) => (s.startsWith("$") ? SAMPLE[route] : s))
    .join("/");

/** Visible text under 16 px that is set in capitals or tracked wider than 0.02em. */
const offenders = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll("body *")) {
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (!hasText || !box.width || !box.height || style.visibility === "hidden") continue;
      const size = parseFloat(style.fontSize);
      if (size >= 16) continue;
      const tracking =
        style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing) / size;
      if (style.textTransform === "uppercase" || tracking > 0.02)
        out.push(
          `${el.tagName.toLowerCase()} "${el.textContent?.trim().slice(0, 24)}" ${size}px ${style.textTransform} ${tracking.toFixed(3)}em`,
        );
    }
    return out;
  });

for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  test(`no small label is set in capitals or tracked wide, on a page, its tabs or its sheets, at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height });
    const found = new Map<string, string>();
    const look = async (where: string) => {
      for (const item of await offenders(page)) if (!found.has(item)) found.set(item, where);
    };
    for (const route of ROUTES) {
      await page.goto(pathOf(route));
      await expect(page.locator("h1")).toHaveCount(1);
      await look(route);
      const tabs = page.locator("main [role=tab]");
      for (let i = 1; i < (await tabs.count()); i++) {
        const tab = tabs.nth(i);
        // A click before hydration is lost; click until the tab reports itself selected.
        await expect(async () => {
          await tab.click();
          await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
        }).toPass();
        await look(`${route} › ${(await tab.textContent())?.trim()}`);
      }
    }
    // Below md the sidebar's labels live only in the navigation sheet.
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    const sheet = page.getByRole("dialog");
    for (const name of width < 768 ? ["Open navigation", "Copilot"] : ["Copilot"]) {
      await expect(async () => {
        await page.getByRole("button", { name, exact: true }).click();
        await expect(sheet).toBeVisible({ timeout: 1000 });
      }).toPass();
      await look(name);
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
    }
    expect([...found].map(([item, where]) => `${where}: ${item}`)).toEqual([]);
  });
}
