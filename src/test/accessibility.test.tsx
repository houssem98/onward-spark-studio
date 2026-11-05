import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FOCUSABLE, audit, clickTab, open, setUp } from "./a11y";

setUp();

const PATHS = [
  "/",
  "/performance",
  "/credit",
  "/crime",
  "/crime/CASE-0917",
  "/data",
  "/models",
  "/models/MDL-002",
  "/investigations",
  "/investigations/INV-2025-014",
  "/audit",
  "/reports/RPT-FY25-PERF",
];

async function exercise(path: string, out: Set<string>) {
  await open(path);
  audit(path, out);
  for (const tab of [...document.querySelectorAll('[role="tab"]')]) {
    await clickTab(tab);
    audit(`${path} [${tab.textContent?.trim() ?? "?"}]`, out);
  }
}

describe("accessibility", () => {
  it("names every button, labels every field and makes every clickable row focusable, on every page and tab", async () => {
    const problems = new Set<string>();
    for (const path of PATHS) {
      await exercise(path, problems);
      cleanup();
    }
    await open("/");
    await act(async () => {
      fireEvent.click(document.querySelector('button[aria-label="Copilot"]')!);
    });
    audit("/ [copilot]", problems);
    expect([...problems]).toEqual([]);
  }, 120_000);

  it("starts the tab order with a skip link, then the navigation, then the page", async () => {
    await open("/models");
    const order = [...document.querySelectorAll(FOCUSABLE)];
    const first = order[0] as HTMLAnchorElement | undefined;
    expect(first?.textContent).toMatch(/Skip to content/);
    expect(first?.getAttribute("href")).toBe("#main");
    expect(document.getElementById("main")).not.toBeNull();
    const firstNav = order.findIndex((e) => e.closest('nav[aria-label="Main"]'));
    const firstMain = order.findIndex((e) => e.closest("main"));
    expect(firstNav).toBeGreaterThan(0);
    expect(firstMain).toBeGreaterThan(firstNav);
    const mainActions = order.filter((e) => e.closest("main"));
    expect(mainActions.some((e) => /Inventory report/.test(e.textContent ?? ""))).toBe(true);
  });

  it("draws focus from the theme ring and stops motion when the user asks", () => {
    // The rules the stylesheet applies, not text a comment could hold.
    const css = readFileSync(join(process.cwd(), "src/styles.css"), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:[^;]*var\(--ring\)/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*transition-duration:\s*0\.01ms !important[\s\S]*animation-duration:\s*0\.01ms !important/,
    );
  });
});
