import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

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

for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  test(`identifiers and dates never wrap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const wrapped: string[] = [];
    let checked = 0;
    for (const route of ROUTES) {
      await page.goto(pathOf(route));
      await expect(page.locator("h1")).toHaveCount(1);
      const result = await page.evaluate(() => {
        const ID = /^[A-Z][A-Z0-9]{0,6}(?:-[A-Z0-9]+)+$/;
        const DATE = /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}(?::\d{2})?)?$/;
        const out = { checked: 0, wrapped: [] as string[] };
        for (const td of document.querySelectorAll<HTMLElement>("main table td")) {
          const text = (td.textContent ?? "").trim();
          if (!td.offsetParent || !(ID.test(text) || DATE.test(text))) continue;
          out.checked++;
          // Line boxes of the text itself: a rect starting below the current line's bottom
          // opens a new line. Element boxes are skipped, since a smaller inline span sits at a
          // different top on the same line.
          const rects: DOMRect[] = [];
          const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(n);
            rects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
          }
          rects.sort((a, b) => a.top - b.top);
          let lines = 0;
          let bottom = -Infinity;
          for (const r of rects) {
            if (r.top >= bottom - 1) lines++;
            bottom = Math.max(bottom, r.bottom);
          }
          if (lines > 1) out.wrapped.push(`${text} (${lines} lines)`);
        }
        return out;
      });
      checked += result.checked;
      wrapped.push(...result.wrapped.map((w) => `${route}: ${w}`));
    }
    expect(checked, "identifier and date cells found").toBeGreaterThan(20);
    expect(wrapped).toEqual([]);
  });
}

test("register headers stay visible while their container scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.goto("/crime");
  const box = page.locator("main table:has(thead th button)").first().locator("xpath=..");
  const moved = await box.evaluate((el) => {
    el.scrollTop = 120;
    const th = el.querySelector("thead th")!;
    return {
      scrolled: el.scrollTop,
      offset: Math.round(th.getBoundingClientRect().top - el.getBoundingClientRect().top),
    };
  });
  expect(moved.scrolled, "the register scrolls inside its container").toBeGreaterThan(0);
  expect(moved.offset, "header offset from the container top").toBe(0);
});
