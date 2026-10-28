import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { AppShell, NAV_GROUPS } from "@/components/AppShell";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

async function renderShell() {
  const root = createRootRoute({
    component: () => (
      <AppShell>
        <Outlet />
      </AppShell>
    ),
  });
  const paths = [
    ...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to)),
    "/models/$id",
    "/investigations/$id",
    "/crime/$id",
  ];
  const router = createRouter({
    routeTree: root.addChildren(
      paths.map((p) =>
        createRoute({ getParentRoute: () => root, path: p, component: () => <p>page</p> }),
      ),
    ),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  return router;
}

describe("command palette", () => {
  it("opens with Ctrl+K, filters as you type, and Enter navigates to the record", async () => {
    const router = await renderShell();
    expect(screen.queryByRole("dialog", { name: "Search BankIntelli" })).toBeNull();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByPlaceholderText(/Search pages, investigations/);

    fireEvent.change(input, { target: { value: "SME Credit Risk" } });
    expect(screen.getByRole("option", { name: /SME Credit Risk Model/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Retail PD Scorecard/ })).toBeNull();

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(router.state.location.pathname).toBe("/models/MDL-002");
    expect(screen.queryByRole("dialog", { name: "Search BankIntelli" })).toBeNull();
  });

  it("lists cases and investigations, and keeps the copilot as a labeled entry", async () => {
    await renderShell();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const input = await screen.findByPlaceholderText(/Search pages, investigations/);
    fireEvent.change(input, { target: { value: "CASE-0917" } });
    expect(
      screen.getByRole("option", { name: /^CASE-0917 · Repeated sub-threshold/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /^INV-2026-004 · / })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /Copilot \(predefined demo answers\)/ }),
    ).toBeInTheDocument();
  });
});
