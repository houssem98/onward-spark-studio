import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { demoRepo } from "@/repo/demo";

// Files that still type fixture names or ids; owned elsewhere (F47). The list can only shrink.
const NOT_YET_MIGRATED = ["src/routes/models.$id.tsx"];

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f).replace(/\\/g, "/");
    return statSync(p).isDirectory() ? (p.endsWith("/ui") ? [] : files(p)) : [p];
  });

async function fixtureTerms() {
  const [fin, crime, ds, mdl, inv] = await Promise.all([
    demoRepo.finance.read(),
    demoRepo.crime.read(),
    demoRepo.datasets.read(),
    demoRepo.models.read(),
    demoRepo.investigations.read(),
  ]);
  const ids = [
    ...crime.alerts,
    ...crime.cases,
    ...ds.datasets,
    ...ds.issues,
    ...mdl.models,
    ...inv.investigations,
    ...inv.reports,
  ].map((r) => r.id);
  const names = [
    ...fin.peers.flatMap((p) => [p.name, p.name.split(" ")[0]!]),
    ...mdl.models.map((m) => m.name),
  ];
  return [...new Set([...ids, ...names])];
}

describe("fixture records reach the UI only through the repository", () => {
  it("no page or component types a fixture name or id", async () => {
    const terms = await fixtureTerms();
    const hits = (f: string) => {
      const src = readFileSync(f, "utf8");
      return terms.filter((t) =>
        new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(src),
      );
    };
    const found = [...files("src/routes"), ...files("src/components")]
      .filter((f) => /\.tsx?$/.test(f) && !NOT_YET_MIGRATED.includes(f))
      .flatMap((f) => hits(f).map((t) => `${f}: ${t}`));
    expect(found).toEqual([]);
    for (const f of NOT_YET_MIGRATED)
      expect(hits(f), `${f} no longer needs its exemption`).not.toEqual([]);
  });
});
