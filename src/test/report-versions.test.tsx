import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import * as finance from "@/data/finance";
import { buildReport, type ReportSnapshot } from "@/lib/report";
import { demoRepo } from "@/repo/demo";
import { open, setUp } from "./a11y";

setUp();

const NOTICE = "notice";
const ID = "RPT-FY25-PERF";

const restore: (() => void)[] = [];
function patch<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]) {
  const old = obj[key];
  obj[key] = value;
  restore.push(() => (obj[key] = old));
}
afterEach(() => {
  while (restore.length) restore.pop()!();
});

async function live(): Promise<ReportSnapshot> {
  const { investigations, reports, actions } = await demoRepo.investigations.read();
  const report = reports.find((r) => r.id === ID)!;
  return {
    report,
    inv: investigations.find((i) => i.id === report.investigation)!,
    finance: await demoRepo.finance.read(),
    issues: (await demoRepo.datasets.read()).issues,
    actions,
    audit: await demoRepo.audit.read(),
  };
}
const render = (s: ReportSnapshot) => buildReport({ ...s, notice: NOTICE });

describe("report versions (L5 T4)", () => {
  it("re-renders a saved version with identical numbers after the data changes", async () => {
    const v = await demoRepo.reports.save(ID, await live());
    const saved = render(v.snapshot);

    const peer = finance.BRIDGES.find((b) => b.id === "peer")!;
    patch(peer, "steps", [
      { label: "Volume", value: -17, kind: "measured" },
      ...peer.steps.slice(1),
    ]);
    patch(
      finance.DEPARTMENTS.find((d) => d.id === "credit")!,
      "revenue",
      125,
    );
    expect(render(await live()).sections).not.toEqual(saved.sections);

    const [again] = (await demoRepo.reports.read()).versions.filter(
      (x) => x.version === v.version && x.report === ID,
    );
    expect(render(again!.snapshot)).toEqual(saved);
    expect(saved.sections[8]!.lines[0]).toBe("Gap = 120 − 150 = −30");
  });

  it("saves an edit as a new version and leaves the earlier one as it was", async () => {
    const before = (await demoRepo.reports.read()).versions.filter((x) => x.report === ID);
    const v1 = await demoRepo.reports.save(ID, await live());
    await demoRepo.investigations.addAction({
      action: "Confirm the Cascade leasing split",
      finding: "F-014-2",
      owner: "A. Haddad",
      due: "2026-02-28",
      priority: "Medium",
      status: "Open",
      outcome: "Pricing reviewed",
    });
    const v2 = await demoRepo.reports.save(ID, await live());
    expect([v1.version, v2.version]).toEqual([before.length + 1, before.length + 2]);
    const plan = (s: ReportSnapshot) => render(s).sections[12]!.lines.join("\n");
    expect(plan(v1.snapshot)).not.toContain("Confirm the Cascade leasing split");
    expect(plan(v2.snapshot)).toContain("Confirm the Cascade leasing split");
    expect((await demoRepo.audit.read())[0]).toMatchObject({
      module: "Reports",
      entity: ID,
      action: "Version saved",
      detail: `Version ${v2.version}`,
    });
  });

  it("refuses to change a saved version", async () => {
    const v = await demoRepo.reports.save(ID, await live());
    expect(() => {
      (v.snapshot.inv as { title: string }).title = "Edited";
    }).toThrow(TypeError);
    expect(() => {
      (v.snapshot.finance.bridges[0]!.steps[0] as { value: number }).value = 0;
    }).toThrow(TypeError);
    expect(Object.isFrozen(v)).toBe(true);
  });

  it("saves from the page, opens the version by its URL, and says when a version does not exist", async () => {
    const router = await open(`/reports/${ID}`);
    expect(screen.getByText(/Live report, not saved/)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save version" }));
    });
    const v = (router.state.location.search as { v?: number }).v!;
    expect(v).toBeGreaterThan(0);
    expect(await screen.findByText(new RegExp(`^Version ${v}, saved`))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Version ${v}` })).toHaveAttribute(
      "href",
      `/reports/${ID}?v=${v}`,
    );

    const { cleanup } = await import("@testing-library/react");
    cleanup();
    await open(`/reports/${ID}?v=999`);
    expect(screen.getByText(`Version 999 of ${ID} does not exist.`)).toBeInTheDocument();
  }, 30_000);
});
