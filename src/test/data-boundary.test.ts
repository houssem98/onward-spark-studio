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
const NOT_YET_MIGRATED: string[] = [];

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
