import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

const root = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(join(root, dir)).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
  });

function linkTargets() {
  const targets = new Map<string, string>();
  for (const file of walk("src").filter((f) => /\.tsx?$/.test(f) && !f.includes("/test/"))) {
    const text = readFileSync(join(root, file), "utf8");
    for (const m of text.matchAll(/\bto(?:=|: )"(\/[^"]*)"/g)) targets.set(m[1]!, file);
  }
  return targets;
}

describe("link integrity", () => {
  it("finds the app's link targets", () => {
    expect(linkTargets().size).toBeGreaterThan(5);
  });

  it("resolves every in-app link to a route", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const dead = [...linkTargets()]
      .filter(([to]) => {
        const path = to.replace(/\$\w+/g, "sample-id");
        return router.matchRoutes(path).at(-1)?.routeId === rootRouteId;
      })
      .map(([to, file]) => `${to} (${file})`);
    expect(dead).toEqual([]);
  });
});
