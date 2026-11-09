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
  // The bars follow the explanation read, which runs once the page is live (T9).
  await expect(bars.first()).toBeVisible({ timeout: 60_000 });
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

// L11 T5: the tab reads as the journey, in order, at both widths, with nothing overflowing.
for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  test(`the explainability journey reads in order at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.setViewportSize({ width, height });
    await page.goto("/credit");
    const link = page.getByRole("link", { name: "Retail PD Scorecard" });
    await expect(async () => {
      await link.click();
      await expect(page).toHaveURL(/\/models\/MDL-001\?tab=explainability$/, { timeout: 2000 });
    }).toPass({ timeout: 60_000 });
    // A click before hydration loads the page in full; measure layout once its stylesheets apply.
    await page.waitForLoadState("load");
    const stages = page.locator("[data-stage]");
    await expect(stages).toHaveCount(6);
    expect(await stages.evaluateAll((s) => s.map((x) => x.getAttribute("data-stage")))).toEqual([
      "Inputs and data quality",
      "Prediction",
      "Global importance",
      "Contributions by case",
      "Case explanation",
      "Review",
    ]);
    // Explanations are read after the page (T9): wait for them, then five stages are complete and
    // the review waits on a decision MDL-001 does not have.
    await expect(stages.first()).toHaveAttribute("data-state", "success");
    expect(await stages.evaluateAll((s) => s.map((x) => x.getAttribute("data-state")))).toEqual([
      ...Array(5).fill("success"),
      "pending",
    ]);
    await expect(page.locator("h1")).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "horizontal overflow").toBe(0);
    expect(errors).toEqual([]);
  });
}

// L11 T4: every beeswarm point travels once from zero and comes to rest where its contribution is.
test("beeswarm points travel once from zero and rest at their contribution", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/models/MDL-001?tab=explainability");
  const swarm = page.locator("svg[data-beeswarm]");
  await expect(swarm).toBeVisible();
  const off = await swarm.evaluate(async (svg) => {
    const points = [...svg.querySelectorAll<SVGCircleElement>("circle[data-case]")];
    const travelling = points.filter((p) =>
      p.getAnimations().some((a) => (a as CSSAnimation).animationName === "point-travel"),
    );
    await Promise.all(points.flatMap((p) => p.getAnimations().map((a) => a.finished)));
    const left = svg.getBoundingClientRect().left;
    const misplaced = points.filter((p) => {
      const r = p.getBoundingClientRect();
      return Math.abs(r.left + r.width / 2 - left - Number(p.getAttribute("cx"))) > 0.5;
    });
    return { points: points.length, travelling: travelling.length, misplaced: misplaced.length };
  });
  expect(off.points).toBeGreaterThanOrEqual(200);
  expect(off.travelling, "every point travels").toBe(off.points);
  expect(off.misplaced, "every point rests at its contribution").toBe(0);
});

// A row's figures, without the reliability column ChartFrame adds after them (L4 T5).
const VALUE = "td:not([data-reliability])";

// L11 T8 (council C19): a step not yet revealed shows nothing on hover; a revealed one does.
test("hovering a step that is not revealed yet shows no value", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/models/MDL-001?tab=explainability");
  const frame = page.locator("[data-case-waterfall]");
  const play = frame.getByRole("button", { name: "Play" });
  await expect
    .poll(() => play.evaluate((b) => Object.keys(b).some((k) => k.startsWith("__react"))), {
      timeout: 60_000,
    })
    .toBe(true);
  await expect(frame).toHaveAttribute("data-step", "0");
  await frame.scrollIntoViewIfNeeded();
  const cells = frame.locator("table tbody tr");
  const baseline = (await cells.first().locator(VALUE).last().textContent())!;
  const output = (await cells.last().locator(VALUE).last().textContent())!;
  const plot = (await frame.locator(".recharts-cartesian-grid").boundingBox())!;
  const ticks = frame.locator(".recharts-xAxis .recharts-cartesian-axis-tick");
  const tooltip = frame.locator(".recharts-tooltip-wrapper");
  const hover = async (i: number) => {
    const at = (await ticks.nth(i).boundingBox())!;
    await page.mouse.move(at.x + at.width / 2, plot.y + plot.height / 2);
    await page.mouse.move(at.x + at.width / 2 + 2, plot.y + plot.height / 2 + 2);
  };
  await hover(0);
  await expect(tooltip, "a revealed step shows its value").toContainText(baseline);
  await hover((await ticks.count()) - 1);
  await expect(tooltip).not.toContainText(output);
});

// L11 T9 (council C9): stepping by keyboard to either end keeps focus on the control used.
test("focus stays on the step controls at the first and last step", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/models/MDL-001?tab=explainability");
  const frame = page.locator("[data-case-waterfall]");
  const forward = frame.getByRole("button", { name: "Step forward" });
  await expect
    .poll(() => forward.evaluate((b) => Object.keys(b).some((k) => k.startsWith("__react"))), {
      timeout: 60_000,
    })
    .toBe(true);
  const focused = () => page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  await forward.focus();
  const last = Number(
    (await frame.locator("text=/Step \\d+ of \\d+/").textContent())!.split(" of ")[1],
  );
  for (let i = 0; i < last; i++) await page.keyboard.press("Enter");
  await expect(frame).toHaveAttribute("data-step", String(last));
  expect(await focused()).toBe("Step forward");
  await frame.getByRole("button", { name: "Step back" }).focus();
  for (let i = 0; i < last; i++) await page.keyboard.press("Enter");
  await expect(frame).toHaveAttribute("data-step", "0");
  expect(await focused()).toBe("Step back");
});

// L11 T10 (council C18): under reduced motion the bars, the points and the case land at once.
test.describe("under reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("bars, beeswarm points and the case are placed at once", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/models/MDL-001?tab=explainability");
    const frame = page.locator("[data-case-waterfall]");
    await expect(frame).toBeVisible({ timeout: 60_000 });
    const moving = await page.evaluate(() => {
      const els = [...document.querySelectorAll("[data-bar-fill], circle[data-case]")];
      const timed = els
        .flatMap((el) => el.getAnimations())
        .filter((a) => Number(a.effect?.getComputedTiming().duration ?? 0) > 1);
      return { elements: els.length, timed: timed.length };
    });
    expect(moving.elements).toBeGreaterThan(200);
    expect(moving.timed, "animations longer than 1 ms").toBe(0);
    const last = (await frame.locator("text=/Step \\d+ of \\d+/").textContent())!.split(" of ")[1];
    await expect(frame).toHaveAttribute("data-step", last!);
  });
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
  const output = await frame.locator("table tbody tr").last().locator(VALUE).last().textContent();
  const labels = frame.locator(".recharts-label-list text");
  await expect(labels).toHaveCount(await frame.locator("table tbody tr").count());
  await expect(labels.last()).toHaveText(output!);
  await expect(line).toContainText(`Output log-odds ${output!}`);
  expect(Number(await frame.getAttribute("data-cumulative"))).toBeCloseTo(
    Number(output!.replace("−", "-")),
    4,
  );
});
