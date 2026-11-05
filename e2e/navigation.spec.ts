import { expect, test, type Page } from "@playwright/test";

type Probe = { vt: number; ys: number[]; shift: number; run: number };

/**
 * Counts view transitions, which swallow clicks while they run (L10 T8, C1), and sums every
 * layout shift, including those right after a click, which the CLS metric itself would forgive.
 */
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { probe: Probe };
    w.probe = { vt: 0, ys: [], shift: 0, run: 0 };
    const start = document.startViewTransition?.bind(document);
    if (start)
      document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
        w.probe.vt++;
        return start(arg);
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
  // Visit every page once, so the measured pass is not timing the dev server's first compile,
  // which starves the frame sampler (3 frames in 1.5 s on a cold route).
  for (const href of [...hrefs.slice(1), hrefs[0]!]) {
    await nav.locator(`a[href="${href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${href === "/" ? "/$" : href}$`));
    await expect(page.locator("main h1")).toHaveCount(1);
  }

  const report: string[] = [];
  const off: string[] = [];
  for (const href of [...hrefs.slice(1), hrefs[0]!]) {
    // Samples the indicator's top every frame from just before the click until the next route's
    // sampler takes over. A fixed 1.5 s window ended before a slow landing under gate load, with
    // 12 samples all at the start, and so reported a jump it never watched (L10 T10).
    await page.evaluate(() => {
      const p = (window as unknown as { probe: Probe }).probe;
      p.shift = 0;
      p.vt = 0;
      p.ys = [];
      const run = ++p.run;
      const tick = () => {
        if (p.run !== run) return;
        const bar = document.querySelector('nav[aria-label="Main"] [data-nav-indicator]');
        if (bar) p.ys.push(Math.round(bar.getBoundingClientRect().y));
        requestAnimationFrame(tick);
      };
      tick();
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
    const end = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Main"]')!;
      const box = (el: Element | null) => {
        const r = el?.getBoundingClientRect();
        return r ? [Math.round(r.y), Math.round(r.height)] : null;
      };
      const active = nav.querySelector('a[aria-current="page"]');
      return {
        href: active?.getAttribute("href"),
        link: box(active),
        bar: box(nav.querySelector("[data-nav-indicator]")),
      };
    });
    const [from, to] = [p.ys[0] ?? NaN, end.bar?.[0] ?? NaN];
    const between = p.ys.filter((y) => y > Math.min(from, to) + 1 && y < Math.max(from, to) - 1);
    report.push(
      `${href} shift ${p.shift.toFixed(4)} vt ${p.vt} indicator ${from}→${to} over ${between.length} frames`,
    );
    if (p.shift >= 0.1) off.push(`${href}: layout shift ${p.shift.toFixed(4)}`);
    if (end.href !== href) off.push(`${href}: aria-current on ${end.href}`);
    if (!end.bar || !end.link || end.bar.some((v, i) => Math.abs(v - end.link![i]!) > 1))
      off.push(
        `${href}: indicator at ${JSON.stringify(end.bar)}, item at ${JSON.stringify(end.link)}`,
      );
    if (p.vt !== 0) off.push(`${href}: ${p.vt} view transitions`);
    if (motion && between.length === 0)
      off.push(`${href}: the indicator jumped ${from}→${to} (${p.ys.join(",")})`);
    if (!motion && between.length > 0)
      off.push(`${href}: the indicator slid under reduced motion (${between.join(",")})`);
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
