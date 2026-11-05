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

/**
 * Clears the probe. With `sample`, also records the nav indicator's top every frame until the
 * next reset: a fixed window ended before a slow landing under gate load, with every sample at
 * the start, and so reported a jump it never watched (L10 T10).
 */
const reset = (page: Page, sample: boolean) =>
  page.evaluate((sample) => {
    const p = (window as unknown as { probe: Probe }).probe;
    p.shift = 0;
    p.vt = 0;
    p.ys = [];
    const run = ++p.run;
    if (!sample) return;
    const tick = () => {
      if (p.run !== run) return;
      const bar = document.querySelector('nav[aria-label="Main"] [data-nav-indicator]');
      if (bar) p.ys.push(Math.round(bar.getBoundingClientRect().y));
      requestAnimationFrame(tick);
    };
    tick();
  }, sample);

/** A link clicked before hydration is a full page load, with nothing to measure. */
async function hydrated(page: Page) {
  const last = page.locator('nav[aria-label="Main"] a').last();
  await expect
    .poll(() => last.evaluate((a) => Object.keys(a).some((k) => k.startsWith("__reactProps"))), {
      timeout: 60_000,
    })
    .toBe(true);
}

/** Waits for the page to come to rest: no animation or transition still running (L10 T8, C17). */
const settle = (page: Page) =>
  expect
    .poll(
      () =>
        page.evaluate(
          () => document.getAnimations().filter((a) => a.playState === "running").length,
        ),
      { timeout: 10_000 },
    )
    .toBe(0);

const urlOf = (href: string) =>
  new RegExp(`${href === "/" ? "/" : href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

async function walkNav(page: Page, motion: boolean, width: number) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await instrument(page);
  const desktop = width >= 768;
  await page.setViewportSize({ width, height: desktop ? 900 : 844 });
  await page.goto("/");
  await expect(page.locator("main h1")).toHaveCount(1);
  await hydrated(page);
  const nav = page.locator('nav[aria-label="Main"]').first();
  const hrefs = await nav.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  expect(hrefs.length, "nav entries").toBeGreaterThanOrEqual(8);
  const order = [...hrefs.slice(1), hrefs[0]!];
  // At 390 px the sidebar is hidden; its links are followed as a script would, which is a route
  // change all the same, and layout shift is about the page that lands (L10 T8, C18).
  const go = async (href: string) => {
    const link = nav.locator(`a[href="${href}"]`);
    if (desktop) await link.click();
    else await link.evaluate((a) => (a as HTMLElement).click());
  };
  // Visit every page once, so the measured pass is not timing the dev server's first compile.
  for (const href of order) {
    await go(href);
    await expect(page).toHaveURL(urlOf(href));
    await expect(page.locator("main h1")).toHaveCount(1);
  }

  const report: string[] = [];
  const off: string[] = [];
  for (const href of order) {
    await reset(page, desktop);
    // A click before hydration is lost; click until the route changes.
    await expect(async () => {
      await go(href);
      await expect(page).toHaveURL(urlOf(href), { timeout: 1500 });
    }).toPass();
    await expect(page.locator("main h1")).toHaveCount(1);
    await settle(page);
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
    if (p.shift >= 0.1) off.push(`${href}: layout shift ${p.shift.toFixed(4)}`);
    if (end.href !== href) off.push(`${href}: aria-current on ${end.href}`);
    if (p.vt !== 0) off.push(`${href}: ${p.vt} view transitions`);
    if (!desktop) {
      report.push(`${href} shift ${p.shift.toFixed(4)} vt ${p.vt}`);
      continue;
    }
    const [from, to] = [p.ys[0] ?? NaN, end.bar?.[0] ?? NaN];
    const between = p.ys.filter((y) => y > Math.min(from, to) + 1 && y < Math.max(from, to) - 1);
    report.push(
      `${href} shift ${p.shift.toFixed(4)} vt ${p.vt} indicator ${from}→${to} over ${between.length} frames`,
    );
    if (!end.bar || !end.link || end.bar.some((v, i) => Math.abs(v - end.link![i]!) > 1))
      off.push(
        `${href}: indicator at ${JSON.stringify(end.bar)}, item at ${JSON.stringify(end.link)}`,
      );
    if (motion && between.length === 0)
      off.push(`${href}: the indicator jumped ${from}→${to} (${p.ys.join(",")})`);
    if (!motion && between.length > 0)
      off.push(`${href}: the indicator slid under reduced motion (${between.join(",")})`);
  }

  if (desktop) {
    const aside = page.locator("aside");
    const duration = await aside.evaluate((el) => getComputedStyle(el).transitionDuration);
    if (motion ? duration !== "0.22s" : parseFloat(duration) > 0.001)
      off.push(`sidebar collapse transition ${duration}`);
    // The width itself, frame by frame, through a collapse and back (L10 T8, C19).
    const widths = await page.evaluate(async () => {
      const aside = document.querySelector("aside")!;
      const toggle = aside.querySelector<HTMLElement>('button[aria-label="Toggle sidebar"]')!;
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      const seen: number[] = [];
      for (let i = 0; i < 2; i++) {
        toggle.click();
        const t0 = performance.now();
        while (performance.now() - t0 < 600) {
          await frame();
          seen.push(Math.round(aside.getBoundingClientRect().width));
        }
      }
      return seen;
    });
    const [narrow, wide] = [Math.min(...widths), Math.max(...widths)];
    const moving = widths.filter((w) => w > narrow + 1 && w < wide - 1);
    report.push(`sidebar ${wide}→${narrow}→${wide} over ${moving.length} frames`);
    if (wide - narrow < 100) off.push(`sidebar did not collapse (${narrow} to ${wide})`);
    if (motion && moving.length < 2) off.push(`sidebar width jumped (${[...new Set(widths)]})`);
    if (!motion && moving.length > 0) off.push(`sidebar width moved under reduced motion`);
  }

  console.log(`${motion ? "motion" : "reduced"} ${width}: ${report.join(" · ")}`);
  expect(errors).toEqual([]);
  expect(off).toEqual([]);
}

/** A page and the detail pages it links to; the investigations register opens rows by click. */
const DETAILS: [string, string][] = [
  ["/", "/investigations/"],
  ["/models", "/models/"],
  ["/crime", "/crime/"],
  ["/", "/reports/"],
];

/** Layout shift landing on a detail page, at a desktop and a phone width (L10 T8, C18). */
async function walkDetails(page: Page, width: number) {
  await instrument(page);
  await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
  const off: string[] = [];
  const report: string[] = [];
  for (const [from, prefix] of DETAILS) {
    await page.goto(from);
    await expect(page.locator("main h1")).toHaveCount(1);
    await hydrated(page);
    const link = page.locator(`main a[href^="${prefix}"]`).first();
    await expect(link, `${from} links to a page under ${prefix}`).toBeAttached();
    const href = (await link.getAttribute("href"))!;
    const was = (await page.locator("main h1").textContent())!;
    await settle(page);
    await reset(page, false);
    await link.evaluate((a) => (a as HTMLElement).click());
    await expect(page).toHaveURL(urlOf(href));
    await expect(page.locator("main h1")).not.toHaveText(was);
    await settle(page);
    const p = await probe(page);
    report.push(`${href} shift ${p.shift.toFixed(4)} vt ${p.vt}`);
    if (p.shift >= 0.1) off.push(`${href}: layout shift ${p.shift.toFixed(4)}`);
    if (p.vt !== 0) off.push(`${href}: ${p.vt} view transitions`);
  }
  console.log(`details ${width}: ${report.join(" · ")}`);
  expect(off).toEqual([]);
}

test.describe("with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test("every nav entry lands on its route; the indicator slides; nothing shifts", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await walkNav(page, true, 1440);
  });

  test("at 390 px every nav route lands without layout shift", async ({ page }) => {
    test.setTimeout(120_000);
    await walkNav(page, true, 390);
  });

  for (const width of [1440, 390])
    test(`detail routes land without layout shift at ${width} px`, async ({ page }) => {
      test.setTimeout(120_000);
      await walkDetails(page, width);
    });
});

test("under reduced motion every nav entry lands on its route with no transition", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await walkNav(page, false, 1440);
});
