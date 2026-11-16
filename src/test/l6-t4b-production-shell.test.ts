import { describe, expect, it } from "vitest";

import { buildReport } from "@/lib/report";
import { demoRepo } from "@/repo/demo";
import type { Repository } from "@/repo/types";
import { readState } from "@/store/app-store";

// L6 T4b: production has no source for crime, datasets or models, and no bank finance data; the shell
// and a report must still open there, saying what is not connected.
const refuse = async (): Promise<never> => {
  throw new Error("Production data source not configured");
};
const without = (fail: () => Promise<never>): Repository => ({
  ...demoRepo,
  environment: "production",
  crime: { ...demoRepo.crime, read: fail },
  datasets: { ...demoRepo.datasets, read: fail },
  models: { ...demoRepo.models, read: fail },
});

describe("production pages open (L6 T4b)", () => {
  it("loads the shell with each unconnected domain empty and named", async () => {
    const s = await readState(without(refuse));
    expect([s.alerts, s.cases, s.datasets, s.issues, s.models, s.driftAlerts]).toEqual([
      [],
      [],
      [],
      [],
      [],
      [],
    ]);
    expect(s.unconnected).toEqual(["crime", "datasets", "models"]);
    expect(s.investigations.length).toBeGreaterThan(0);
    expect((await readState(demoRepo)).unconnected).toEqual([]);
  });

  it("still fails on any other error", async () => {
    const broken = without(async () => {
      throw new Error("permission denied for table alerts");
    });
    await expect(readState(broken)).rejects.toThrow(/permission denied/);
  });

  it("renders a report from its investigation alone when there is no finance data", async () => {
    const { investigations, reports } = await demoRepo.investigations.read();
    const report = reports[0]!;
    const inv = investigations.find((i) => i.id === report.investigation)!;
    const doc = buildReport({ report, inv, issues: [], actions: [], audit: [], notice: "" });
    const section = (t: string) => doc.sections.find((x) => x.title.endsWith(`. ${t}`))!.lines;
    expect(section("Root-cause findings")).toHaveLength(inv.findings.length);
    expect(section("KPI scorecard")).toEqual(["No bank finance data in this environment."]);
    expect(section("Scope and methodology")).toContain(
      "Scope: no bank finance data in this environment.",
    );
    expect(doc.verified).toBe(false);
  });
});
