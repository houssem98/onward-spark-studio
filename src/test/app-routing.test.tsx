import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { getRouter } from "@/router";
import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  // A view transition swallows clicks while it plays (L10 T8, C1), and where a browser lacks
  // view-transition types the router's guard is skipped and every change runs one (C14). None runs.
  it("runs no view transition on any route, tab or filter change, in any browser", () => {
    expect(getRouter().options.defaultViewTransition).toBeUndefined();
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
      );
    const found = files("src")
      .filter((f) => /\.tsx?$/.test(f) && !f.startsWith(join("src", "test")))
      .filter((f) => /viewTransition|startViewTransition/.test(readFileSync(f, "utf8")));
    expect(found).toEqual([]);
  });
});
