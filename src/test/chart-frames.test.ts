import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const count = (text: string, tag: string) => text.split(`<${tag}`).length - 1;

describe("chart frames", () => {
  it("puts every chart in a route inside a ChartFrame", () => {
    const short = readdirSync(join(root, "src/routes"))
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => {
        const text = readFileSync(join(root, "src/routes", f), "utf8");
        // Waterfall renders its own ResponsiveContainer, so each use is a chart too.
        const charts = count(text, "ResponsiveContainer") + count(text, "Waterfall ");
        return { f, charts, frames: count(text, "ChartFrame") };
      })
      .filter((r) => r.charts > r.frames)
      .map((r) => `${r.f}: ${r.charts} charts, ${r.frames} frames`);
    expect(short).toEqual([]);
  });
});
