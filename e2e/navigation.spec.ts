import { expect, test, type Page } from "@playwright/test";

type Probe = { vt: number; anims: string[]; shift: number };

/**
 * Counts view transitions and the animations each one runs, and sums every layout shift,
 * including those right after a click, which the CLS metric itself would forgive.
 */
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { probe: Probe };
    w.probe = { vt: 0, anims: [], shift: 0 };
    const start = document.startViewTransition?.bind(document);
    if (start)
      document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
        w.probe.vt++;
        const t = start(arg);
        t.ready
          .then(() =>
            w.probe.anims.push(
              document
                .getAnimations()
                .map((a) => (a.effect as KeyframeEffect).pseudoElement ?? "")
                .join(" "),
            ),
          )
          .catch(() => {});
        return t;
      }) as typeof document.startViewTransition;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        w.probe.shift += (e as PerformanceEntry & { value: number }).value;
    }).observe({ type: "layout-shift" });
  });
}

const probe = (page: Page) => page.evaluate(() => (window as unknown as { probe: Probe }).probe);

async function walkNav(page: Page, motion: boolean) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await instrument(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("main h1")).toHaveCount(1);
  const nav = page.getByRole("navigation", { name: "Main" });
  // A link clicked before hydration is a full page load, with no view transition to see.
  await expect
    .poll(
      () =>
        nav
          .getByRole("link")
          .last()
          .evaluate((a) => Object.keys(a).some((k) => k.startsWith("__reactProps"))),
      { timeout: 60_000 },
    )
    .toBe(true);
  const hrefs = await nav
    .getByRole("link")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  expect(hrefs.length, "nav entries").toBeGreaterThanOrEqual(8);

  const report: string[] = [];
  const off: string[] = [];
  for (const href of [...hrefs.slice(1), hrefs[0]!]) {
    await page.evaluate(() => {
      const p = (window as unknown as { probe: Probe }).probe;
      p.shift = 0;
      p.vt = 0;
      p.anims = [];
    });
    const link = nav.locator(`a[href="${href}"]`);
    // A click before hydration is lost; click until the route changes.
    await expect(async () => {
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${href === "/" ? "/$" : href}$`), { timeout: 1500 });
    }).toPass();
    await expect(page.locator("main h1")).toHaveCount(1);
    await page.waitForTimeout(700);
    const p = await probe(page);
    const named = await page.evaluate(() =>
      [...document.querySelectorAll("*")]
        .filter((el) => getComputedStyle(el).viewTransitionName === "nav-active")
        .map((el) => el.getAttribute("href")),
    );
    report.push(`${href} shift ${p.shift.toFixed(4)} vt ${p.vt}`);
    if (p.shift >= 0.1) off.push(`${href}: layout shift ${p.shift.toFixed(4)}`);
    if (named.join() !== href) off.push(`${href}: nav-active on ${JSON.stringify(named)}`);
    if (motion && p.vt !== 1) off.push(`${href}: ${p.vt} view transitions`);
    if (motion && !p.anims.some((a) => a.includes("::view-transition-group(nav-active)")))
      off.push(`${href}: the active indicator did not move (${JSON.stringify(p.anims)})`);
    if (!motion && p.vt !== 0) off.push(`${href}: ${p.vt} view transitions under reduced motion`);
  }

  const aside = page.locator("aside");
  const duration = await aside.evaluate((el) => getComputedStyle(el).transitionDuration);
  if (motion ? duration !== "0.22s" : parseFloat(duration) > 0.001)
    off.push(`sidebar collapse transition ${duration}`);

  console.log(`${motion ? "motion" : "reduced"}: ${report.join(" · ")}`);
  expect(errors).toEqual([]);
  expect(off).toEqual([]);
}

test.describe("with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test("every nav entry lands on its route; the indicator slides; nothing shifts", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await walkNav(page, true);
  });
});

test("under reduced motion every nav entry lands on its route with no transition", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await walkNav(page, false);
});
