import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// L9 T4: the human chose direction A (Institutional Intelligence) with C's radius, table
// rules and control motion, and Spectral + Public Sans. docs/design/ART_DIRECTION.md.
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
const css = read("src/styles.css");
const rootBlock = css.match(/\n:root \{([\s\S]*?)\n\}/)?.[1] ?? "";
const token = (name: string) => rootBlock.match(new RegExp(`\\n\\s*--${name}:\\s*([^;]+);`))?.[1];

const CHOSEN: Record<string, string> = {
  radius: "0.375rem",
  background: "oklch(0.972 0.006 80)",
  foreground: "oklch(0.24 0.035 262)",
  card: "oklch(0.992 0.003 80)",
  primary: "oklch(0.36 0.09 262)",
  accent: "oklch(0.95 0.02 195)",
  "accent-foreground": "oklch(0.32 0.06 195)",
  "muted-foreground": "oklch(0.5 0.03 262)",
  border: "oklch(0.9 0.008 80)",
  ring: "oklch(0.55 0.1 195)",
  success: "oklch(0.5 0.1 155)",
  sidebar: "oklch(0.21 0.04 262)",
  "sidebar-primary": "oklch(0.42 0.08 195)",
  "chart-1": "oklch(0.36 0.09 262)",
  "chart-2": "oklch(0.58 0.09 195)",
  "shadow-card": "0 1px 0 oklch(0.24 0.035 262 / 4%)",
};

describe("direction A tokens", () => {
  it.each(Object.entries(CHOSEN))("--%s is the chosen value", (name, value) => {
    expect(token(name)).toBe(value);
  });

  it("sets Public Sans for the interface and Spectral for page and panel titles", () => {
    expect(css).toContain('--font-sans: "Public Sans",');
    expect(css).toContain('--font-display: "Spectral",');
    expect(css).toMatch(/h1,\s*h2 \{\s*font-family: var\(--font-display\);/);
    const link = read("src/routes/__root.tsx");
    expect(link).toContain("family=Public+Sans:");
    expect(link).toContain("family=Spectral:");
    expect(link).not.toContain("IBM+Plex");
  });

  it("figures stay tabular in the interface face", () => {
    expect(css).toMatch(
      /@utility num \{\s*font-family: var\(--font-sans\);\s*font-variant-numeric: tabular-nums;/,
    );
  });

  it("has density tokens and the shared table and page wrappers use them", () => {
    for (const name of ["row", "cell-x", "cell-y", "section"])
      expect(css, name).toMatch(new RegExp(`--spacing-${name}: [\\d.]+rem;`));
    const table = read("src/components/DataTable.tsx");
    expect(table).toContain("h-row");
    expect(table.match(/px-cell-x py-cell-y/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    const pages = readdirSync(join(root, "src/routes")).filter(
      (f) => f.endsWith(".tsx") && f !== "__root.tsx",
    );
    expect(pages.filter((f) => !read(`src/routes/${f}`).includes("space-y-section"))).toEqual([]);
  });
});
