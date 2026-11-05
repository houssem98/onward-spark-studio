import { expect, test } from "@playwright/test";

// The importance bars in the browser (L11 T2): they grow from zero with motion on, the keyboard
// walks every one, and Enter opens the feature's definition.
test.use({ contextOptions: { reducedMotion: "no-preference" } });

test("importance bars grow from zero, and the keyboard reaches each and opens its definition", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/models/MDL-001?tab=explainability");
  const bars = page.locator("[data-importance-bar]");
  await expect(bars.first()).toBeVisible();
  await expect
    .poll(() => bars.first().evaluate((b) => Object.keys(b).some((k) => k.startsWith("__react"))), {
      timeout: 60_000,
    })
    .toBe(true);

  const grow = await page
    .locator("[data-bar-fill]")
    .evaluateAll((fills) =>
      fills.map((f) =>
        f
          .getAnimations()
          .some(
            (a) =>
              (a as CSSAnimation).animationName === "bar-grow" &&
              (a.effect as KeyframeEffect).getKeyframes()[0]?.["transform"] === "scaleX(0)",
          ),
      ),
    );
  expect(grow.length).toBeGreaterThanOrEqual(5);
  expect(grow.every(Boolean), "every bar grows from zero").toBe(true);

  const n = await bars.count();
  await bars.first().focus();
  for (let i = 0; i < n; i++) {
    const bar = bars.nth(i);
    await expect(bar).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(bar).toHaveAttribute("aria-expanded", "true");
    const region = page.locator(`#${await bar.getAttribute("aria-controls")}`);
    await expect(region).toContainText((await bar.getAttribute("data-feature"))!);
    if (i < n - 1) await page.keyboard.press("Tab");
  }
});

// L11 T3: a case plays from the baseline to the output, and its last bar reads the output.
test("a case plays to the end and its final label is the output", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/models/MDL-001?tab=explainability");
  const frame = page.locator("[data-case-waterfall]");
  const play = frame.getByRole("button", { name: "Play" });
  await expect(play).toBeVisible();
  await expect
    .poll(() => play.evaluate((b) => Object.keys(b).some((k) => k.startsWith("__react"))), {
      timeout: 60_000,
    })
    .toBe(true);
  await expect(frame).toHaveAttribute("data-step", "0");

  await play.click();
  const line = frame.locator("[data-step-line]");
  await expect(line).toContainText("Output log-odds", { timeout: 30_000 });
  const output = await frame.locator("table tbody tr").last().locator("td").last().textContent();
  const labels = frame.locator(".recharts-label-list text");
  await expect(labels).toHaveCount(await frame.locator("table tbody tr").count());
  await expect(labels.last()).toHaveText(output!);
  await expect(line).toContainText(`Output log-odds ${output!.replace("+", "")}`);
  expect(Number(await frame.getAttribute("data-cumulative"))).toBeCloseTo(
    Number(output!.replace("−", "-")),
    4,
  );
});
