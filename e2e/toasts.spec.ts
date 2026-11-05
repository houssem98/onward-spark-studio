import { expect, test, type Page } from "@playwright/test";

// Toasts move on the motion tokens like every overlay; sonner ships its own 400 ms `ease` and
// injects it after the app's stylesheet (L10 T8, C12). Read from what the browser applies.
async function toastMotion(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/credit");
  const button = page.getByRole("button", { name: "Generate report" });
  // A click before hydration is lost; click until a toast shows.
  await expect(async () => {
    await button.click();
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 60_000 });
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const token = root.getPropertyValue("--duration-base").trim();
    const read = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        sel,
        property: s.transitionProperty,
        ms: s.transitionDuration.split(", ").map((d) => parseFloat(d) * 1000),
        // Split between easings, not inside cubic-bezier(…).
        easing: s.transitionTimingFunction.split(/,\s*(?![^(]*\))/),
      };
    };
    return {
      baseMs: token.endsWith("ms") ? parseFloat(token) : parseFloat(token) * 1000,
      ease: root.getPropertyValue("--ease-standard"),
      parts: [
        read("[data-sonner-toaster]"),
        read("[data-sonner-toast]"),
        read("[data-sonner-toast] > *"),
      ],
    };
  });
}

// The minified token writes `.2` where the browser writes `0.2`.
const curve = (e: string) => e.replace(/\s/g, "").replace(/\b0\./g, ".");

test.describe("with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test("a toast moves on --duration-base and --ease-standard", async ({ page }) => {
    test.setTimeout(120_000);
    const { baseMs, ease, parts } = await toastMotion(page);
    console.log(`toast: base ${baseMs}ms ${ease.trim()} · ${JSON.stringify(parts)}`);
    expect(baseMs).toBeGreaterThan(0);
    expect(curve(ease)).toMatch(/^cubic-bezier\(/);
    expect(parts.filter((p) => p === null)).toEqual([]);
    const off = parts.flatMap((p) => [
      ...p!.ms.filter((ms) => Math.abs(ms - baseMs) > 0.5).map((ms) => `${p!.sel}: ${ms}ms`),
      ...p!.easing.filter((e) => curve(e) !== curve(ease)).map((e) => `${p!.sel}: ${e}`),
    ]);
    expect(off).toEqual([]);
  });
});

test("under reduced motion a toast does not move", async ({ page }) => {
  test.setTimeout(120_000);
  const { parts } = await toastMotion(page);
  console.log(`toast reduced: ${JSON.stringify(parts)}`);
  expect(parts.filter((p) => p === null)).toEqual([]);
  const moving = parts.filter((p) => p!.property !== "none" && p!.ms.some((ms) => ms > 1));
  expect(moving.map((p) => `${p!.sel}: ${p!.property} ${p!.ms.join(",")}`)).toEqual([]);
});
