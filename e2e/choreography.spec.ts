import { expect, test, type Page } from "@playwright/test";

// Budget, stated before measuring: the page's sections reveal in DOM order and the whole sequence
// ends within 400 ms; the primary action is clickable within 500 ms of the click that navigated,
// as rule 5 is written. T6 timed from the new h1 instead, which hid a view transition that
// swallowed clicks for about 266 ms after landing (L10 T8, C1 and C2).
const SEQUENCE_MS = 400;
// The production build Playwright serves beside the dev server (playwright.config.ts): the dev
// server's own latency, 51 to 504 ms after landing with no motion at all, would swamp the budget.
test.use({ baseURL: "http://localhost:3419" });
const ACTION_MS = 500;
const PRIMARY =
  "[data-page-header] button:not([disabled]), [data-page-header] a[href], [data-page-header] select, main [role=tab], main select, main button:not([disabled])";

async function hydratedHome(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("main h1")).toHaveCount(1);
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
  return nav;
}

/**
 * The reveal animations on the page's sections on the first screen, in DOM order: [delay, end] in
 * ms. Sections held until they scroll into view are returned apart, with their top.
 */
const sequence = (page: Page) =>
  page.evaluate(() => {
    const sections = [...(document.querySelector("main > [data-stagger]")?.children ?? [])];
    const held = sections
      .filter((s) => s.getAttribute("data-reveal") === "hidden")
      .map((s) => Math.round(s.getBoundingClientRect().top + scrollY));
    const seq = sections
      .filter((s) => s.getAttribute("data-reveal") !== "hidden")
      .map((s) => {
        const a = s.getAnimations().find((x) => (x as CSSAnimation).animationName === "page-in");
        if (!a) return null;
        const t = a.effect!.getTiming();
        return [Number(t.delay), Number(t.delay) + Number(t.duration)] as const;
      });
    return { seq, held, fold: innerHeight };
  });

async function walk(page: Page, motion: boolean) {
  const nav = await hydratedHome(page);
  const hrefs = await nav
    .getByRole("link")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  // Visit every page once, so the measured pass is not timing the dev server's first compile.
  for (const href of [...hrefs.slice(1), hrefs[0]!]) {
    await nav.locator(`a[href="${href}"]`).click();
    await expect(page.locator("main h1")).toHaveCount(1);
  }
  const off: string[] = [];
  const report: string[] = [];
  for (const href of [...hrefs.slice(1), hrefs[0]!]) {
    // Timed in the page, frame by frame: Playwright waits 500 ms between its own retries once a
    // hit test fails, so its click timeout would time that back-off, not the page. Clickable
    // means what Playwright checks: the same box two frames running, and the element itself at
    // its centre (during a view transition the browser hits the document instead).
    const t = await page.evaluate(
      async ({ href, sel, limit }) => {
        const frame = () => new Promise((r) => requestAnimationFrame(r));
        const was = document.querySelector("main h1")?.textContent;
        const t0 = performance.now();
        document.querySelector<HTMLElement>(`nav[aria-label="Main"] a[href="${href}"]`)!.click();
        let landed = 0;
        let box = "";
        while (performance.now() - t0 < 5000) {
          await frame();
          const now = performance.now();
          if (now - t0 > limit) return { landed: landed ? landed - t0 : null, clickable: null };
          if (!landed) {
            if (document.querySelector("main h1")?.textContent !== was) landed = now;
            else continue;
          }
          const el = document.querySelector<HTMLElement>(sel);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const next = [r.x, r.y, r.width, r.height].map(Math.round).join();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          if (next === box && r.width > 0 && hit && (hit === el || el.contains(hit)))
            return { landed: landed - t0, clickable: now - t0 };
          box = next;
        }
        return { landed: null, clickable: null };
      },
      { href, sel: PRIMARY, limit: ACTION_MS },
    );
    await expect(page).toHaveURL(new RegExp(`${href === "/" ? "/$" : href}$`));
    const { seq, held, fold } = await sequence(page);
    if (held.some((top) => top < fold))
      off.push(`${href}: a section on the first screen is held hidden ${JSON.stringify(held)}`);
    if (!motion && held.length)
      off.push(`${href}: ${held.length} sections held under reduced motion`);
    // And Playwright agrees it is clickable once settled.
    await page.locator(PRIMARY).first().click({ trial: true });
    const ends = seq.map((s) => s?.[1] ?? NaN);
    const end = Math.max(...ends);
    const ms = t.clickable === null ? null : Math.round(t.clickable);
    report.push(
      `${href} landed ${Math.round(t.landed ?? NaN)}ms, action ${ms}ms after the click, sequence ${end}ms over ${seq.length}`,
    );
    if (ms === null)
      off.push(`${href}: primary action not clickable within ${ACTION_MS}ms of the click`);
    if (seq.length < 2 || seq.some((s) => s === null))
      off.push(`${href}: sections without a reveal ${JSON.stringify(seq)}`);
    else if (motion) {
      if (end > SEQUENCE_MS) off.push(`${href}: sequence ends at ${end}ms`);
      if (seq.some((s, i) => i > 0 && s![0] < seq[i - 1]![0]))
        off.push(`${href}: sections out of order ${JSON.stringify(seq)}`);
      if (seq[0]![0] >= seq.at(-1)![0]) off.push(`${href}: no stagger ${JSON.stringify(seq)}`);
    } else if (end > 1) off.push(`${href}: reduced motion still sequences to ${end}ms`);
  }
  console.log(`${motion ? "motion" : "reduced"}: ${report.join(" · ")}`);
  expect(off).toEqual([]);
}

test.describe("with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test("sections reveal in order within 400 ms and the primary action is clickable within 500 ms", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await walk(page, true);
  });
});

test("under reduced motion every section is there at once", async ({ page }) => {
  test.setTimeout(180_000);
  await walk(page, false);
});

const PAGES = [
  "/",
  "/performance",
  "/credit",
  "/crime",
  "/data",
  "/models",
  "/investigations",
  "/audit",
];

/** At 390 px most sections start below the first screen; they wait there and arrive in view. */
async function belowTheFold(page: Page, motion: boolean) {
  await page.setViewportSize({ width: 390, height: 844 });
  const off: string[] = [];
  const report: string[] = [];
  let total = 0;
  for (const path of PAGES) {
    await page.goto(path);
    const stagger = page.locator("main > [data-stagger]");
    await expect
      .poll(() => stagger.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__react"))), {
        timeout: 60_000,
      })
      .toBe(true);
    const sections = stagger.locator(":scope > *");
    const at = await sections.evaluateAll((ss) =>
      ss.map((s) => ({
        top: Math.round(s.getBoundingClientRect().top + scrollY),
        held: s.getAttribute("data-reveal") === "hidden",
        opacity: getComputedStyle(s).opacity,
      })),
    );
    const held = at.flatMap((s, i) => (s.held ? [i] : []));
    total += held.length;
    report.push(`${path} ${held.length} of ${at.length} held`);
    for (const [i, s] of at.entries()) {
      if (s.held && s.top < 844) off.push(`${path}: section ${i} held on the first screen`);
      if (s.held && s.opacity !== "0") off.push(`${path}: section ${i} held but visible`);
      if (!s.held && s.top >= 844 && motion)
        off.push(`${path}: section ${i} below the first screen not held`);
    }
    for (const i of held) {
      const s = sections.nth(i);
      await s.scrollIntoViewIfNeeded();
      await expect(s, `${path}: section ${i} revealed`).toHaveAttribute("data-reveal", "shown");
      await expect
        .poll(() => s.evaluate((el) => getComputedStyle(el).opacity), { timeout: 2000 })
        .toBe("1");
      const ran = await s.evaluate((el) =>
        el.getAnimations().some((a) => (a as CSSAnimation).animationName === "page-in"),
      );
      if (!ran) off.push(`${path}: section ${i} appeared without its entrance`);
    }
  }
  console.log(`${motion ? "fold" : "fold reduced"}: ${report.join(" · ")}`);
  if (motion && total === 0) off.push("no section on any page waits below the first screen");
  if (!motion && total > 0) off.push(`${total} sections held under reduced motion`);
  expect(off).toEqual([]);
}

test.describe("below the first screen, with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test("sections wait hidden and reveal as they scroll into view", async ({ page }) => {
    test.setTimeout(180_000);
    await belowTheFold(page, true);
  });
});

// The stagger as the browser applies it, not as the stylesheet's text reads (L10 T8, C11).
test.describe("the stagger", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test("steps each section one --stagger apart and stops at the sixth", async ({ page }) => {
    test.setTimeout(120_000);
    // Tall enough that every section of the overview starts on the first screen.
    await page.setViewportSize({ width: 1440, height: 4000 });
    await page.goto("/");
    await expect(page.locator("main h1")).toHaveCount(1);
    const { delays, step } = await page.evaluate(() => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--stagger").trim();
      const step = v.endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000;
      const delays = [...document.querySelector("main > [data-stagger]")!.children].map((s) => {
        const a = s.getAnimations().find((x) => (x as CSSAnimation).animationName === "page-in");
        return a ? Number(a.effect!.getTiming().delay) : null;
      });
      return { delays, step };
    });
    console.log(`stagger: ${step}ms steps, delays ${delays.join(", ")}`);
    expect(step).toBeGreaterThan(0);
    expect(delays.length).toBeGreaterThanOrEqual(7);
    expect(delays).toEqual(delays.map((_, i) => Math.min(i, 5) * step));
  });
});

test("below the first screen under reduced motion, nothing waits", async ({ page }) => {
  test.setTimeout(180_000);
  await belowTheFold(page, false);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, contextOptions: { reducedMotion: "no-preference" } });
  test("every section of every page is visible", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const off: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      // Until the reveal has run its course, not for a fixed time (L10 T8, C17).
      await expect
        .poll(() =>
          page.evaluate(
            () => document.getAnimations().filter((a) => a.playState === "running").length,
          ),
        )
        .toBe(0);
      const hidden = await page.evaluate(() =>
        [...(document.querySelector("main")?.querySelectorAll(":scope > * > *") ?? [])]
          .filter((s) => getComputedStyle(s).opacity !== "1")
          .map((s) => s.tagName),
      );
      if (hidden.length) off.push(`${path}: ${hidden.length} sections not visible`);
    }
    expect(off).toEqual([]);
  });
});
