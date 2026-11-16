import { render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { PageError } from "@/components/PageError";
import { getRouter } from "@/router";

// L6 T4d: a page's error stays inside the shell, so the navigation can still be used.
function app(error: Error) {
  const root = createRootRoute({
    component: () => (
      <div>
        <nav>Shell navigation</nav>
        <Outlet />
      </div>
    ),
  });
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    loader: () => {
      throw error;
    },
    component: () => <p>Page</p>,
  });
  const other = createRoute({ getParentRoute: () => root, path: "/tn-banks" });
  const investigations = createRoute({ getParentRoute: () => root, path: "/investigations" });
  return createRouter({
    routeTree: root.addChildren([page, other, investigations]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    defaultErrorComponent: PageError,
  });
}

describe("page errors inside the shell (L6 T4d)", () => {
  it("is the app's default error component", () => {
    expect(getRouter().options.defaultErrorComponent).toBe(PageError);
  });

  it("says a page's source is not connected, names what works, and keeps the shell", async () => {
    render(<RouterProvider router={app(new Error("Production data source not configured"))} />);
    expect(await screen.findByText(/not connected in this environment/)).toBeInTheDocument();
    expect(screen.getByText("Shell navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tunisian Banks" })).toHaveAttribute(
      "href",
      "/tn-banks",
    );
  });

  it("offers a retry for any other error", async () => {
    render(<RouterProvider router={app(new Error("permission denied"))} />);
    expect(await screen.findByText(/permission denied/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByText("Shell navigation")).toBeInTheDocument();
  });
});
