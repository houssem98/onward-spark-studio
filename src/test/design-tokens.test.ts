import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { TYPE } from "@/components/kit";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const sources = [
  ...readdirSync(join(root, "src/routes")).map((f) => `src/routes/${f}`),
  ...readdirSync(join(root, "src/components")).map((f) => `src/components/${f}`),
].filter((f) => f.endsWith(".tsx"));

function hits(pattern: RegExp) {
  return sources.flatMap((f) => [...read(f).matchAll(pattern)].map((m) => `${f}: ${m[0]}`));
}

describe("design tokens", () => {
  it("uses no colour literals outside the theme", () => {
    expect(hits(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(|-\[#/g)).toEqual([]);
  });

  it("references only CSS variables the theme defines", () => {
    const css = read("src/styles.css");
    const undefinedVars = hits(/var\(--([\w-]+)\)/g).filter((h) => {
      const name = h.match(/var\(--([\w-]+)\)/)![1];
      return !new RegExp(`--${name}\\s*:`).test(css);
    });
    expect(undefinedVars).toEqual([]);
  });

  it("sizes text from the type scale, never with arbitrary values", () => {
    expect(hits(/\btext-\[\d+(?:\.\d+)?(?:px|rem)\]/g)).toEqual([]);
    expect(hits(/\bfontSize(?::|=)\s*\{?\s*["'`]?\d/g)).toEqual([]);
    const css = read("src/styles.css").replace(/@theme inline \{[\s\S]*?\n\}/g, "");
    expect([...css.matchAll(/font-size:(?!\s*var\()[^;]+/g)].map((m) => m[0])).toEqual([]);
  });

  it("keeps the type scale charts use equal to the CSS tokens", () => {
    const css = read("src/styles.css") + read("node_modules/tailwindcss/theme.css");
    for (const [name, px] of Object.entries(TYPE))
      expect(css, name).toContain(`--text-${name}: ${px / 16}rem;`);
  });
});
