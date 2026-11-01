import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

const tokens = [
  ...readFileSync(join(process.cwd(), "src/styles.css"), "utf8").matchAll(/--text-([\w-]+):/g),
].map((m) => m[1]!);

describe("cn", () => {
  it("knows every type-scale token in the theme", () => {
    expect(tokens.length).toBeGreaterThan(0);
  });

  it.each(tokens)("keeps text-%s next to a text colour", (name) => {
    expect(cn(`text-${name}`, "text-warning")).toBe(`text-${name} text-warning`);
    expect(cn(`text-${name}`, "text-sidebar-accent-foreground")).toContain(`text-${name}`);
  });

  it("still lets a later size replace an earlier one", () => {
    expect(cn("text-micro", "text-sm")).toBe("text-sm");
  });

  const spacing = [
    ...readFileSync(join(process.cwd(), "src/styles.css"), "utf8").matchAll(/--spacing-([\w-]+):/g),
  ].map((m) => m[1]!);

  it.each(spacing)("treats the %s density token as spacing", (name) => {
    expect(cn(`px-${name}`, "px-2")).toBe("px-2");
    expect(cn(`py-${name}`, "text-warning")).toBe(`py-${name} text-warning`);
    expect(cn(`space-y-${name}`, "space-y-2")).toBe("space-y-2");
  });
});
