import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("visual baseline", () => {
  it("has a row for every page route at 1440 and 390 px", () => {
    const text = readFileSync(join(root, "docs/audit/VISUAL_BASELINE.md"), "utf8");
    const rows = new Set(
      [...text.matchAll(/^\| `(src\/routes\/[^`]+)` \| (1440|390) \|/gm)].map(
        (m) => `${m[1]} ${m[2]}`,
      ),
    );
    const missing = readdirSync(join(root, "src/routes"))
      .filter((f) => f.endsWith(".tsx") && f !== "__root.tsx")
      .flatMap((f) => [`src/routes/${f} 1440`, `src/routes/${f} 390`])
      .filter((key) => !rows.has(key));
    expect(missing).toEqual([]);
  });
});
