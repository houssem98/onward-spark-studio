import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// WCAG 2.2 contrast computed from the theme's OKLCH tokens, no dependency:
// OKLCH -> OKLab -> linear sRGB (clipped to gamut) -> relative luminance.
const css = readFileSync(join(process.cwd(), "src/styles.css"), "utf8").replace(/\r\n/g, "\n");
const rootBlock = css.match(/\n:root \{([\s\S]*?)\n\}/)?.[1] ?? "";

function oklch(name: string): [number, number, number] {
  const m = rootBlock.match(
    new RegExp(`\\n\\s*--${name}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\);`),
  );
  if (!m) throw new Error(`--${name} is not a plain oklch() token`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function luminance([L, C, h]: [number, number, number]) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (x: number) => Math.min(1, Math.max(0, x));
  const r = clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

const ratio = (fg: string, bg: string) => {
  const [x, y] = [luminance(oklch(fg)), luminance(oklch(bg))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// [text or mark, surface, minimum]: 4.5 for text, 3 for focus rings and large marks.
const PAIRS: [string, string, number][] = [
  ["foreground", "background", 4.5],
  ["foreground", "card", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "card", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["success", "background", 4.5],
  ["success", "card", 4.5],
  ["warning", "background", 4.5],
  ["warning", "card", 4.5],
  ["critical", "background", 4.5],
  ["critical", "card", 4.5],
  ["sidebar-foreground", "sidebar", 4.5],
  ["ink-muted", "sidebar", 4.5],
  ["sidebar-accent-foreground", "sidebar-accent", 4.5],
  ["sidebar-primary-foreground", "sidebar-primary", 4.5],
  ["ring", "background", 3],
  ["ring", "card", 3],
  ["primary", "background", 3],
  ["chart-1", "card", 3],
  ["chart-2", "card", 3],
  ["chart-3", "card", 3],
  ["chart-4", "card", 3],
  ["chart-5", "card", 3],
];

describe("contrast", () => {
  it("knows white on black is 21:1", () => {
    expect((luminance([1, 0, 0]) + 0.05) / (luminance([0, 0, 0]) + 0.05)).toBeCloseTo(21, 1);
  });

  it("meets WCAG 2.2 AA for every text and focus pair", () => {
    const failing = PAIRS.filter(([fg, bg, min]) => ratio(fg, bg) < min).map(
      ([fg, bg, min]) => `${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)} < ${min}`,
    );
    expect(failing).toEqual([]);
  });
});
