import { expect, test, type Page } from "@playwright/test";

// The budget stated in the L10 T7 Journal entry before any measurement, over the window from the
// nav click to 1000 ms after the new page's h1 renders.
const LONGEST_MS = 200;
const BLOCKING_MS = 300;
const DROPPED_FRAMES = 6;
const BUSY_MS = 300;
const FRAME_MS = 1000 / 60;

test.use({ baseURL: "http://localhost:3419", contextOptions: { reducedMotion: "no-preference" } });

type Measure = { landed: number; tasks: number[]; dropped: number; frames: number };

async function hydrated(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { tasks: { start: number; duration: number }[] };
    w.tasks = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.tasks.push({ start: e.startTime, duration: e.duration });
    }).observe({ type: "longtask", buffered: true });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/audit");
  const nav = page.getByRole("navigation", { name: "Main" });
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
}

/** Navigates to `href` from the nav, in the page, and measures the stated window. */
const measure = (page: Page, href: string, busy: number, delay = 0) =>
  page.evaluate(
    async ({ href, busy, delay, frameMs }) => {
      const w = window as unknown as { tasks: { start: number; duration: number }[] };
      const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
      const was = document.querySelector("main h1")?.textContent;
      const t0 = performance.now();
      document.querySelector<HTMLElement>(`nav[aria-label="Main"] a[href="${href}"]`)!.click();
      if (busy)
        setTimeout(() => {
          const s = performance.now();
          while (performance.now() - s < busy);
        }, delay);
      let landed = 0;
      let prev = 0;
      let dropped = 0;
      let frames = 0;
      while (performance.now() - t0 < 10_000) {
        const now = await frame();
        if (!landed) {
          if (document.querySelector("main h1")?.textContent !== was) landed = now;
          prev = now;
          continue;
        }
        frames++;
        dropped += Math.max(0, Math.round((now - prev) / frameMs) - 1);
        prev = now;
        if (now - landed >= 1000) break;
      }
      // Long-task entries arrive after the task ends; give the observer a moment.
      await new Promise((r) => setTimeout(r, 100));
      const end = landed + 1000;
      const tasks = w.tasks
        .filter((t) => t.start + t.duration >= t0 && t.start <= end)
        .map((t) => Math.round(t.duration));
      return { landed: Math.round(landed - t0), tasks, dropped, frames };
    },
    { href, busy, delay, frameMs: FRAME_MS },
  );

const longest = (m: Measure) => Math.max(0, ...m.tasks);
const blocking = (m: Measure) => m.tasks.reduce((s, d) => s + Math.max(0, d - 50), 0);
const describe = (href: string, m: Measure) =>
  `${href}: landed ${m.landed}ms, long tasks [${m.tasks.join(", ")}], longest ${longest(m)}ms, blocking ${blocking(m)}ms, dropped ${m.dropped} of ${m.frames} frames`;

test("a route change and chart entrance on the overview and credit pages stay within the budget", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await hydrated(page);
  const off: string[] = [];
  const report: string[] = [];
  for (const href of ["/", "/credit"]) {
    // Once to load the route's code, then back, then the measured visit.
    await measure(page, href, 0);
    await measure(page, "/audit", 0);
    const m = await measure(page, href, 0);
    // The window held a chart entrance only if a chart drew.
    await expect(page.locator("main .recharts-surface").first()).toBeVisible();
    report.push(describe(href, m));
    if (longest(m) > LONGEST_MS) off.push(`${href}: a ${longest(m)}ms task`);
    if (blocking(m) > BLOCKING_MS) off.push(`${href}: ${blocking(m)}ms blocking`);
    if (m.dropped > DROPPED_FRAMES) off.push(`${href}: ${m.dropped} dropped frames`);
    await measure(page, "/audit", 0);
  }
  console.log(`budget: ${report.join(" · ")}`);
  expect(off).toEqual([]);
});

test("the measure catches a deliberate 300 ms busy loop during the route change", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await hydrated(page);
  await measure(page, "/", 0);
  await measure(page, "/audit", 0);
  const m = await measure(page, "/", BUSY_MS);
  console.log(`busy: ${describe("/", m)}`);
  expect(longest(m)).toBeGreaterThanOrEqual(BUSY_MS);
  expect(longest(m)).toBeGreaterThan(LONGEST_MS);
});

test("the measure catches 150 ms of jank during the reveal and chart entrance", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await hydrated(page);
  await measure(page, "/", 0);
  await measure(page, "/audit", 0);
  // Under the long-task limit, so only the dropped-frame budget can see it.
  const m = await measure(page, "/", 150, 400);
  console.log(`jank: ${describe("/", m)}`);
  expect(m.dropped).toBeGreaterThan(DROPPED_FRAMES);
});
