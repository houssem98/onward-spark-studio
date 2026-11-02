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

async function eachView(page: Page, check: (where: string) => Promise<void>) {
  for (const route of ROUTES) {
    await page.goto(pathOf(route));
    await expect(page.locator("h1")).toHaveCount(1);
    await check(route);
    const tabs = page.locator("main [role=tab]");
    for (let i = 1; i < (await tabs.count()); i++) {
      const tab = tabs.nth(i);
      // A click before hydration is lost; click until the tab reports itself selected.
      await expect(async () => {
        await tab.click();
        await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
      }).toPass();
      await check(`${route} › ${(await tab.textContent())?.trim()}`);
    }
  }
}

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [768, 1024],
  [390, 844],
] as const) {
  test(`KPI bands fill their rows, share a baseline and hold their sparklines at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height });
    const off: string[] = [];
    let bands = 0;
    await eachView(page, async (where) => {
      const found = await page.evaluate(() => {
        const out: string[] = [];
        const bands = [...document.querySelectorAll<HTMLElement>("main [data-kpi-band]")];
        for (const band of bands) {
          if (!band.offsetParent) continue;
          const grid = band.firstElementChild as HTMLElement;
          const right = grid.getBoundingClientRect().right;
          const tiles = [...grid.children] as HTMLElement[];
          const rows = new Map<number, HTMLElement[]>();
          for (const t of tiles) {
            const top = Math.round(t.getBoundingClientRect().top);
            rows.set(top, [...(rows.get(top) ?? []), t]);
          }
          for (const row of rows.values()) {
            const last = row[row.length - 1]!;
            const name = last.dataset["definition"] ?? "?";
            if (Math.abs(last.getBoundingClientRect().right - right) > 1.5)
              out.push(`row ending ${name} leaves an empty cell`);
            const bottoms = row.map((t) => {
              const v = t.querySelector("[data-kpi-value]");
              return v ? Math.round(v.getBoundingClientRect().bottom) : NaN;
            });
            if (bottoms.some(Number.isNaN)) out.push(`row ending ${name}: a value is unmarked`);
            else if (Math.max(...bottoms) - Math.min(...bottoms) > 1)
              out.push(`row ending ${name}: value bottoms ${bottoms.join(",")}`);
          }
          for (const t of tiles) {
            const spark = t.querySelector("svg[data-sparkline]");
            if (!spark) continue;
            const edge =
              t.getBoundingClientRect().right - parseFloat(getComputedStyle(t).paddingRight);
            const over = Math.round(spark.getBoundingClientRect().right - edge);
            if (over > 0) out.push(`${t.dataset["definition"]}: sparkline ${over}px past the tile`);
          }
        }
        return { bands: bands.length, out };
      });
      bands += found.bands;
      off.push(...found.out.map((o) => `${where}: ${o}`));
    });
    expect(bands, "KPI bands found").toBeGreaterThan(5);
    expect([...new Set(off)]).toEqual([]);
  });
}
