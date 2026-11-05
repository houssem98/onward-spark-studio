import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, expect, vi } from "vitest";
import { cleanup } from "@testing-library/react";

import { routeTree } from "@/routeTree.gen";

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** jsdom lacks these; Radix and recharts call them. Call at the top of a test file. */
export function setUp() {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });
  afterEach(cleanup);
}

export async function open(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  await act(async () => {
    await router.load();
  });
  // Reads a page starts on its own, outside its loader, settle before the test looks; a read
  // that never answers is given a bounded number of turns.
  for (let turn = 0; turn < 10; turn++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    if (!queryClient.isFetching()) break;
  }
  return router;
}

/** The text an aria-labelledby points at; empty when the ids resolve to nothing. */
const labelledByText = (el: Element) =>
  (el.getAttribute("aria-labelledby") ?? "")
    .split(/\s+/)
    .map((id) => (id ? (document.getElementById(id)?.textContent ?? "") : ""))
    .join(" ")
    .trim();

const nameOf = (el: Element) =>
  (
    el.getAttribute("aria-label") ||
    labelledByText(el) ||
    el.getAttribute("title") ||
    el.textContent ||
    ""
  ).trim();

function labelled(el: Element) {
  if (el.getAttribute("aria-label") || labelledByText(el)) return true;
  if (el.id && document.querySelector(`label[for="${el.id}"]`)) return true;
  return !!el.closest("label");
}

/** Problems in what is on screen now, keyed so repeats collapse. */
export function audit(where: string, out: Set<string>) {
  for (const b of document.querySelectorAll('button, [role="button"]')) {
    if (!nameOf(b)) out.add(`${where}: unnamed button ${b.outerHTML.slice(0, 80)}`);
  }
  for (const f of document.querySelectorAll("input, select, textarea")) {
    if ((f as HTMLInputElement).type === "hidden" || f.getAttribute("aria-hidden") === "true")
      continue;
    if (!labelled(f))
      out.add(`${where}: unlabeled ${f.tagName.toLowerCase()} ${f.outerHTML.slice(0, 80)}`);
  }
  for (const r of document.querySelectorAll(".cursor-pointer, .cursor-help")) {
    if (r.closest("button, a, [role=tab]") || r.matches("button, a, label, summary")) continue;
    if (r.getAttribute("tabindex") !== "0")
      out.add(
        `${where}: ${r.classList.contains("cursor-help") ? "hover-only help" : "clickable"} ${r.tagName.toLowerCase()} not keyboard-focusable`,
      );
  }
  // Children of role="img" are presentational, so a control inside one drops out of the a11y tree.
  for (const img of document.querySelectorAll('[role="img"]')) {
    if (img.querySelector(FOCUSABLE)) out.add(`${where}: focusable content inside role="img"`);
  }
}

export async function clickTab(tab: Element | string) {
  const el =
    typeof tab === "string"
      ? [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent?.trim() === tab)!
      : tab;
  await act(async () => {
    fireEvent.mouseDown(el, { button: 0 });
    fireEvent.click(el);
  });
}

/**
 * Opens one dialog and returns the problems the audit finds in it. jsdom hangs when a second
 * Radix dialog opens in the same file, so each dialog gets its own test file.
 */
export async function dialogProblems(path: string, openIt: () => unknown) {
  await open(path);
  await act(async () => {
    await openIt();
  });
  expect(
    document.querySelector('[role="dialog"]'),
    `${path}: the dialog did not open`,
  ).not.toBeNull();
  const out = new Set<string>();
  audit(`${path} dialog`, out);
  return [...out];
}

/** Clicks the first keyboard-operable row in the active tab panel, or on the page. */
export function clickFirstRow() {
  const row = document.querySelector(
    '[role="tabpanel"][data-state="active"] tr[tabindex="0"], main tr[tabindex="0"]',
  );
  expect(row, "no row to open").not.toBeNull();
  fireEvent.click(row!);
}
