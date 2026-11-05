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

  it("times every animation and transition from the motion tokens", () => {
    const tsx = (dir: string): string[] =>
      readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? tsx(`${dir}/${e.name}`)
          : e.name.endsWith(".tsx")
            ? [`${dir}/${e.name}`]
            : [],
      );
    const rawInClasses =
      /\b\d+(?:\.\d+)?ms\b|cubic-bezier\(|(?<![\w-])(?:duration|delay)-(?:\d+|\[)|(?<![\w-])ease-(?:linear|in-out|in|out)(?![\w-])/g;
    // Chart animation props and inline styles take their timing from the tokens too: seconds,
    // bare easings and numeric chart durations slipped past the class check (L10 T8, C16).
    const rawInProps =
      /animation(?:Duration|Easing|Begin)=\{?\s*["'`\d]|(?:transition|animation)\w*\s*:\s*["'`][^"'`]*?(?:\d+(?:\.\d+)?m?s\b|cubic-bezier|(?<![\w-])(?:ease|ease-in|ease-out|ease-in-out|linear)(?![\w-]))/g;
    const files = [...tsx("src/routes"), ...tsx("src/components")];
    const raw = files.flatMap((f) =>
      [rawInClasses, rawInProps].flatMap((re) =>
        [...read(f).matchAll(re)].map((m) => `${f}: ${m[0]}`),
      ),
    );
    // The tokens live in :root; the reduced-motion rule's 0.01ms is pinned by the accessibility suite.
    const css = read("src/styles.css")
      .replace(/:root \{[\s\S]*?\n\}/, "")
      .replace(/@theme inline \{[\s\S]*?\n\}/, "")
      .replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/, "");
    const rawInCss =
      /\b\d+(?:\.\d+)?m?s\b|cubic-bezier\(|(?<![\w-])(?:ease|ease-in|ease-out|ease-in-out|linear)(?![\w-])/g;
    raw.push(...[...css.matchAll(rawInCss)].map((m) => `src/styles.css: ${m[0]}`));
    expect(raw).toEqual([]);
    for (const t of [
      "--duration-instant: 120ms;",
      "--duration-quick: 160ms;",
      "--duration-base: 220ms;",
      "--duration-page: 260ms;",
      "--duration-data: 500ms;",
      "--stagger: 40ms;",
      "--ease-standard: cubic-bezier(0.2, 0, 0, 1);",
      "--ease-enter: cubic-bezier(0.05, 0.7, 0.1, 1);",
      "--ease-exit: cubic-bezier(0.3, 0, 1, 1);",
    ])
      expect(read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, ""), t).toContain(t);
  });

  it("keeps the type scale charts use equal to the CSS tokens", () => {
    const css = read("src/styles.css") + read("node_modules/tailwindcss/theme.css");
    for (const [name, px] of Object.entries(TYPE))
      expect(css, name).toContain(`--text-${name}: ${px / 16}rem;`);
  });
});
