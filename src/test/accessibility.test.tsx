import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

async function open(path: string) {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  await act(async () => {
    await router.load();
  });
}

const nameOf = (el: Element) =>
  (
    el.getAttribute("aria-label") ||
    (el.getAttribute("aria-labelledby") ? "labelledby" : "") ||
    el.getAttribute("title") ||
    el.textContent ||
    ""
  ).trim();

function labelled(el: Element) {
  if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return true;
  if (el.id && document.querySelector(`label[for="${el.id}"]`)) return true;
  return !!el.closest("label");
}

/** Problems in what is on screen now, keyed so repeats collapse. */
function audit(where: string, out: Set<string>) {
  for (const b of document.querySelectorAll('button, [role="button"]')) {
    if (!nameOf(b)) out.add(`${where}: unnamed button ${b.outerHTML.slice(0, 80)}`);
  }
  for (const f of document.querySelectorAll("input, select, textarea")) {
    if ((f as HTMLInputElement).type === "hidden" || f.getAttribute("aria-hidden") === "true")
      continue;
    if (!labelled(f))
      out.add(`${where}: unlabeled ${f.tagName.toLowerCase()} ${f.outerHTML.slice(0, 80)}`);
  }
  for (const r of document.querySelectorAll(".cursor-pointer")) {
    if (r.closest("button, a, [role=tab]") || r.matches("button, a, label, summary")) continue;
    if (r.getAttribute("tabindex") !== "0")
      out.add(`${where}: clickable ${r.tagName.toLowerCase()} not keyboard-focusable`);
  }
}

async function exercise(path: string, out: Set<string>) {
  await open(path);
  audit(path, out);
  for (const tab of [...document.querySelectorAll('[role="tab"]')]) {
    await act(async () => {
      fireEvent.mouseDown(tab, { button: 0 });
      fireEvent.click(tab);
    });
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
    const css = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:[^;]*var\(--ring\)/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*transition-duration:\s*0\.01ms !important[\s\S]*animation-duration:\s*0\.01ms !important/,
    );
  });
});
