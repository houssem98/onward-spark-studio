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
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell, NAV_GROUPS } from "@/components/AppShell";
import { routeTree } from "@/routeTree.gen";

const paths = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to));

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

  it("shows the synthetic-data banner on every route, also with the sidebar collapsed", async () => {
    for (const p of paths) {
      await renderShellAt(p);
      expect(screen.getByRole("note", { name: "Environment" })).toHaveTextContent(
        "Demo · synthetic data",
      );
      fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));
      expect(screen.getByRole("note", { name: "Environment" })).toBeVisible();
      document.body.innerHTML = "";
    }
  });

  it("has no form controls that change nothing in the header", async () => {
    await renderShellAt("/");
    expect(screen.queryByRole("combobox", { name: "Reporting period" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Organization" })).toBeNull();
    expect(screen.getByText(/Northstar Bank \(fictional\) · FY2025/)).toBeInTheDocument();
  });
});
