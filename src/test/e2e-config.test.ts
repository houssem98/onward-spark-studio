import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import config from "../../playwright.config";

const specs = readdirSync("e2e").filter((f) => f.endsWith(".spec.ts"));
const read = (f: string) => readFileSync(`e2e/${f}`, "utf8");

describe("the browser suite", () => {
  // A second worker on the same machine moves a timing measure: / measured 94 ms alone and
  // 169 ms beside another spec (L10 T8, C22).
  it("runs every spec that times the page alone, one at a time, after the rest", () => {
    const project = (name: string) => config.projects?.find((p) => p.name === name);
    const [main, timing] = [project("main"), project("timing")];
    expect(timing?.workers).toBe(1);
    expect(timing?.dependencies).toEqual(["main"]);
    const re = timing?.testMatch as RegExp;
    expect(re).toBeInstanceOf(RegExp);
    expect(main?.testIgnore).toBe(re);
    const timed = specs.filter((f) =>
      /performance\.now|requestAnimationFrame|PerformanceObserver/.test(read(f)),
    );
    expect(timed.length).toBeGreaterThanOrEqual(3);
    expect(specs.filter((f) => re.test(f) !== timed.includes(f))).toEqual([]);
  });

  it("waits on conditions, never on fixed sleeps", () => {
    const sleeps = specs.flatMap((f) =>
      read(f)
        .split("\n")
        .filter((line) => line.includes("waitForTimeout("))
        .map((line) => `${f}: ${line.trim()}`),
    );
    expect(sleeps).toEqual([]);
  });
});
