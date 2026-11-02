import { readdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

import { DATE, ID, MONEY } from "../src/lib/register";

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

/** Every route, and every tab on it, since registers also sit in tabs that are not the default. */
async function eachView(page: Page, check: (where: string) => Promise<void>) {
  for (const route of ROUTES) {
    await page.goto(pathOf(route));
    await expect(page.locator("h1")).toHaveCount(1);
    await check(route);
    const tabs = page.locator("main [role=tab]");
    for (let i = 1; i < (await tabs.count()); i++) {
      await tabs.nth(i).click();
      await check(`${route} › ${(await tabs.nth(i).textContent())?.trim()}`);
    }
  }
}

for (const [width, height] of [
  [1440, 900],
  [768, 1024],
  [390, 844],
] as const) {
  test(`identifiers, dates and amounts never wrap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const wrapped: string[] = [];
    let checked = 0;
    await eachView(page, async (where) => {
      const result = await page.evaluate(
        ([id, date, money]) => {
          const whole = [new RegExp(id!), new RegExp(date!), new RegExp(money!)];
          const out = { checked: 0, wrapped: [] as string[] };
          for (const td of document.querySelectorAll<HTMLElement>("main table td")) {
            const text = (td.textContent ?? "").trim();
            if (!td.offsetParent || !whole.some((re) => re.test(text))) continue;
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
        },
        [ID.source, DATE.source, MONEY.source],
      );
      checked += result.checked;
      wrapped.push(...result.wrapped.map((w) => `${where}: ${w}`));
    });
    expect(checked, "identifier, date and amount cells found").toBeGreaterThan(20);
    expect([...new Set(wrapped)]).toEqual([]);
  });
}

test("every visible register has a sticky header carrying its own rule", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const off: string[] = [];
  let tables = 0;
  await eachView(page, async (where) => {
    const found = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("main table")]
        // A chart's data table sits in a closed <details> until asked for; it is not a register.
        .filter((t) => t.offsetParent && !t.closest("details:not([open])"))
        .map((t) => {
          const th = t.querySelector("thead th")!;
          const s = getComputedStyle(th);
          return { name: th.textContent?.trim(), position: s.position, rule: s.boxShadow };
        }),
    );
    tables += found.length;
    for (const f of found)
      if (f.position !== "sticky" || !f.rule.includes("inset"))
        off.push(`${where} (${f.name}): ${f.position}, ${f.rule}`);
  });
  expect(tables, "visible register tables found").toBeGreaterThan(5);
  expect([...new Set(off)]).toEqual([]);
});

test("the selected register row says so to assistive technology", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/crime");
  const rows = page.locator("main tbody tr[tabindex='0']");
  // A click that lands before hydration is lost; click again until the page answers.
  await expect(async () => {
    await rows.first().click();
    await expect(rows.first()).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
  }).toPass();
  await expect(rows.nth(1)).toHaveAttribute("aria-selected", "false");
});

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
