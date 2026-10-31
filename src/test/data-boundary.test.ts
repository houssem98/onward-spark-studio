import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(join(root, dir)).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
  });

const ADAPTER = "src/repo/demo.ts";
// Still reading fixtures directly; L2 T3 and T4 move each one behind the repository.
const NOT_YET_MIGRATED = [
  "src/components/CommandPalette.tsx",
  "src/lib/copilot.ts",
  "src/routes/credit.tsx",
  "src/routes/crime.$id.tsx",
  "src/routes/crime.index.tsx",
  "src/routes/data.tsx",
  "src/routes/index.tsx",
  "src/routes/investigations.index.tsx",
  "src/routes/models.$id.tsx",
  "src/routes/models.index.tsx",
  "src/routes/performance.tsx",
  "src/routes/reports.$id.tsx",
  "src/store/app-store.ts",
];

// A type-only import carries no data, so only value imports, re-exports and dynamic imports count.
const READS_FIXTURES = [
  /^\s*(?:import|export)\s+(?!type\s)[^;]*?\bfrom\s*["'](?:@\/|(?:\.\.?\/)+)data\//m,
  /\bimport\s*\(?\s*["'](?:@\/|(?:\.\.?\/)+)data\//,
];

const readers = walk("src")
  .filter((f) => /\.tsx?$/.test(f) && !f.startsWith("src/data/") && !/\.test\.tsx?$/.test(f))
  .filter((f) => READS_FIXTURES.some((re) => re.test(readFileSync(join(root, f), "utf8"))));

describe("data boundary", () => {
  it("lets only the demo repository read fixture data", () => {
    expect(readers.filter((f) => f !== ADAPTER && !NOT_YET_MIGRATED.includes(f))).toEqual([]);
  });

  it("lists only files that still read fixtures as not yet migrated", () => {
    expect(NOT_YET_MIGRATED.filter((f) => !readers.includes(f))).toEqual([]);
  });
});
