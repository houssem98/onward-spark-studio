import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

// A route file with a `$` segment needs a sample id here, or the first test fails.
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

const SIZES = [
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [360, 800],
] as const;

test("every param route has a sample id", () => {
  expect(ROUTES.filter((r) => r.includes("$") && !SAMPLE[r])).toEqual([]);
});

for (const [width, height] of SIZES) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height } });

    for (const route of ROUTES.filter((r) => !r.includes("$") || SAMPLE[r])) {
      test(route, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text());
        });
        page.on("pageerror", (e) => errors.push(e.message));

        const res = await page.goto(pathOf(route));
        expect(res?.status()).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, "horizontal overflow in px").toBe(0);
        expect(errors).toEqual([]);

        if (width === 1440 || width === 390)
          await page.screenshot({ path: testInfo.outputPath(`${route}-${width}.png`) });
      });
    }
  });
}
