import { expect, test, type Page } from "@playwright/test";

// Budget, stated before measuring: the page's sections reveal in DOM order and the whole sequence
// ends within 400 ms; the primary action is clickable within 500 ms of the navigation landing,
// that is of the new page's h1 rendering. The first run timed from the click instead, and /credit
// took 530 ms under reduced motion, with no animation at all: that is the dev server's route
// latency, which motion does not own. The click-to-clickable time is still reported.
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

/** The reveal animations on the page's sections, in DOM order: [delay, end] in ms. */
const sequence = (page: Page) =>
  page.evaluate(() => {
    const sections = [...(document.querySelector("main > [data-stagger]")?.children ?? [])];
    return sections.map((s) => {
      const a = s.getAnimations().find((x) => (x as CSSAnimation).animationName === "page-in");
      if (!a) return null;
      const t = a.effect!.getTiming();
      return [Number(t.delay), Number(t.delay) + Number(t.duration)] as const;
    });
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
          if (!landed) {
            if (document.querySelector("main h1")?.textContent !== was) landed = now;
            else continue;
          }
          if (now - landed > limit) return { landed: landed - t0, clickable: null };
          const el = document.querySelector<HTMLElement>(sel);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const next = [r.x, r.y, r.width, r.height].map(Math.round).join();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          if (next === box && r.width > 0 && hit && (hit === el || el.contains(hit)))
            return { landed: landed - t0, clickable: now - landed };
          box = next;
        }
        return { landed: null, clickable: null };
      },
      { href, sel: PRIMARY, limit: ACTION_MS },
    );
    await expect(page).toHaveURL(new RegExp(`${href === "/" ? "/$" : href}$`));
    const seq = await sequence(page);
    // And Playwright agrees it is clickable once settled.
    await page.locator(PRIMARY).first().click({ trial: true });
    const ends = seq.map((s) => s?.[1] ?? NaN);
    const end = Math.max(...ends);
    const ms = t.clickable === null ? null : Math.round(t.clickable);
    report.push(
      `${href} landed ${Math.round(t.landed ?? NaN)}ms, action ${ms}ms after, sequence ${end}ms over ${seq.length}`,
    );
    if (ms === null) off.push(`${href}: primary action not clickable within ${ACTION_MS}ms`);
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

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, contextOptions: { reducedMotion: "no-preference" } });
  test("every section of every page is visible", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const off: string[] = [];
    for (const path of [
      "/",
      "/performance",
      "/credit",
      "/crime",
      "/data",
      "/models",
      "/investigations",
      "/audit",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await page.waitForTimeout(SEQUENCE_MS + 200);
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
