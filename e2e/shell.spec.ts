import { expect, test } from "@playwright/test";

/** The alpha channel of a computed colour; a notation it cannot read fails instead of passing as opaque. */
const alpha = (color: string) => {
  const slash = /\/\s*([\d.]+)(%?)\s*\)\s*$/.exec(color);
  if (slash) return parseFloat(slash[1]!) / (slash[2] ? 100 : 1);
  const comma = /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/.exec(color);
  if (comma) return parseFloat(comma[1]!);
  if (/^(rgb|hsl|hwb|lab|lch|oklab|oklch|color)\(/.test(color)) return 1;
  throw new Error(`unreadable colour: ${color}`);
};

test("the top bar is the opaque card surface with a hairline and no blur", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const bar = page.locator("header.no-print.h-16");
  await expect(bar).toHaveCount(1);
  const style = await bar.evaluate((el) => {
    const s = getComputedStyle(el);
    // The tokens as this page computes them, read from a probe element.
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--card)";
    probe.style.borderBottomColor = "var(--border)";
    document.body.append(probe);
    const t = getComputedStyle(probe);
    const tokens = { card: t.backgroundColor, border: t.borderBottomColor };
    probe.remove();
    return {
      blur: s.backdropFilter,
      background: s.backgroundColor,
      hairline: `${s.borderBottomWidth} ${s.borderBottomStyle}`,
      hairlineColor: s.borderBottomColor,
      ...tokens,
    };
  });
  expect(style.blur).toBe("none");
  expect(alpha(style.background), style.background).toBe(1);
  expect(style.background).toBe(style.card);
  expect(style.hairline).toBe("1px solid");
  expect(style.hairlineColor).toBe(style.border);
  expect(alpha(style.hairlineColor), style.hairlineColor).toBeGreaterThan(0);
});

test("the mobile navigation sheet is 272 px wide, a step of the 4 px grid", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const sheet = page.getByRole("dialog");
  // A click before hydration is lost; click until the sheet opens.
  await expect(async () => {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(sheet).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect.poll(async () => (await sheet.boundingBox())?.width).toBe(272);
});
