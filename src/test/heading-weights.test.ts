import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WEIGHT: Record<string, number> = {
  "font-thin": 100,
  "font-extralight": 200,
  "font-light": 300,
  "font-normal": 400,
  "font-medium": 500,
  "font-semibold": 600,
  "font-bold": 700,
  "font-extrabold": 800,
  "font-black": 900,
};

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".tsx") ? [join(dir, e.name)] : [],
  );

describe("heading weights", () => {
  it("asks only for Spectral weights the page loads", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    const loaded = (root.match(/family=Spectral:wght@([\d;]+)/)?.[1] ?? "").split(";").map(Number);
    expect(loaded.length).toBeGreaterThan(0);
    const faux = files("src").flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(/<h[12]\b[^>]*className="([^"]*)"/g)].flatMap((m) =>
        m[1]!
          .split(/\s+/)
          .filter((c) => c in WEIGHT && !loaded.includes(WEIGHT[c]!))
          .map((c) => `${f}: ${c}`),
      ),
    );
    expect(faux).toEqual([]);
  });
});
