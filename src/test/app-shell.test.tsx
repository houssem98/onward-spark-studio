import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  rootRouteId,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell, NAV_GROUPS } from "@/components/AppShell";
import { routeTree } from "@/routeTree.gen";
import { open, setUp } from "./a11y";

setUp();

const paths = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to));
const SAMPLE_PATHS: Record<string, string> = {
  "/crime/$id": "/crime/CASE-0917",
  "/models/$id": "/models/MDL-002",
  "/investigations/$id": "/investigations/INV-2025-014",
  "/reports/$id": "/reports/RPT-FY25-PERF",
};

async function renderShellAt(path: string) {
  const root = createRootRoute({
    component: () => (
      <AppShell>
        <Outlet />
      </AppShell>
    ),
  });
  const pages = paths.map((p) =>
    createRoute({ getParentRoute: () => root, path: p, component: () => <p>page {p}</p> }),
  );
  const router = createRouter({
    routeTree: root.addChildren(pages),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  return router;
}

describe("app shell", () => {
  it("groups navigation as the roadmap does, with only routes that exist", () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual([
      "Overview",
      "Intelligence",
      "Workflow",
      "Administration",
    ]);
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const dead = paths.filter((p) => router.matchRoutes(p).at(-1)?.routeId === rootRouteId);
    expect(dead).toEqual([]);
  });

  it("shows the synthetic-data banner on every real route and the 404, also with the sidebar collapsed and in print", async () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const routes = Object.keys(router.routesByPath).map((p) => SAMPLE_PATHS[p] ?? p);
    expect(
      routes.filter((p) => p.includes("$")),
      "routes without a sample path",
    ).toEqual([]);
    // jsdom applies no stylesheet, so toBeVisible misses a class that hides the banner.
    const hider =
      'aside, [hidden], [aria-hidden="true"], .hidden, .invisible, .sr-only, .no-print, [class*=":hidden"], [class*=":invisible"], [class*=":sr-only"]';
    for (const p of [...routes, "/no-such-page"]) {
      await open(p);
      const banner = () => screen.queryByRole("note", { name: "Environment" });
      expect(banner(), p).not.toBeNull();
      expect(banner(), p).toHaveTextContent("Demo · synthetic data");
      fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));
      expect(banner(), p).toBeVisible();
      expect(banner()?.closest(hider), p).toBeNull();
      cleanup();
    }
  }, 60_000);

  it("has no form controls that change nothing in the header", async () => {
    await renderShellAt("/");
    expect(screen.queryByRole("combobox", { name: "Reporting period" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Organization" })).toBeNull();
    expect(screen.getByText(/Northstar Bank \(fictional\) · FY2025/)).toBeInTheDocument();
  });
});
