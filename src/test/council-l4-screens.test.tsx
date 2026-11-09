import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChartFrame } from "@/components/charts";
import { exportedRecords } from "@/repo/export";
import * as finance from "@/data/finance";
import { answer } from "@/lib/copilot";
import { demoRepo } from "@/repo/demo";
import { clickTab, open, setUp } from "./a11y";

setUp();

// L4 T6b: the council's findings on the screens and in the tests, one test each.
const ROUTES = [
  "/",
  "/performance",
  "/credit",
  "/crime",
  "/crime/CASE-0917",
  "/data",
  "/models",
  "/models/MDL-001",
  "/investigations",
  "/investigations/INV-2025-014",
  "/audit",
];
const HEADER = "How reliable is this figure?";

/** Each view of a route: as it opens, then each of its tabs. */
async function eachView(path: string, look: (where: string) => void) {
  await open(path);
  look(path);
  const tabs = [...document.querySelectorAll('main [role="tab"]')].map((t) =>
    t.textContent!.trim(),
  );
  for (const tab of tabs) {
    await clickTab(tab);
    look(`${path} › ${tab}`);
  }
}

const restore: (() => void)[] = [];
afterEach(() => {
  while (restore.length) restore.pop()!();
});

describe("council fixes on screens and in tests (L4 T6b)", () => {
  it.each(ROUTES)(
    "C3, C23: on %s every table says how reliable its figures are or declares it holds records, and every number and chart is marked synthetic",
    async (path) => {
      const off: string[] = [];
      await eachView(path, (where) => {
        for (const t of document.querySelectorAll("main table")) {
          const heads = [...t.querySelectorAll("thead th")].map((h) => h.textContent?.trim());
          if (!t.hasAttribute("data-records") && !heads.includes(HEADER))
            off.push(`${where}: table [${heads.join(", ")}] has no reliability column`);
          if (heads.includes(HEADER))
            for (const cell of t.querySelectorAll("tbody td[data-reliability]"))
              if (!cell.textContent?.trim()) off.push(`${where}: blank reliability cell`);
        }
        for (const e of document.querySelectorAll("main [data-definition], main figure"))
          if (!e.querySelector("[data-synthetic]"))
            off.push(`${where}: unmarked ${e.textContent?.slice(0, 30)}`);
      });
      expect([...new Set(off)]).toEqual([]);
    },
    60_000,
  );

  it("C17: says a row whose figure is unavailable has no reliable figure, and fills a blank class", () => {
    render(
      <ChartFrame
        title="T"
        unit="u"
        period="p"
        source="S"
        rows={[
          { name: "A", value: null },
          { name: "B", value: 1, reliability: "" },
        ]}
      >
        <div />
      </ChartFrame>,
    );
    const cells = [...document.querySelectorAll("td[data-reliability]")].map((c) => c.textContent);
    expect(cells[0]).toMatch(/^No reliable figure: /);
    expect(cells[1]).toMatch(/\S/);
  });

  it("C19: lists a standing hypothesis with the gaps", async () => {
    await open("/investigations/INV-2025-014");
    const limits = [...document.querySelectorAll("section")].find(
      (s) => s.querySelector("h2")?.textContent === "Limitations",
    )!.textContent;
    expect(limits).toContain("F-014-4: A hypothesis is tested, not verified.");
  });

  it("C24: names the environment in an export's toast and audit detail", () => {
    expect(exportedRecords(3, "demo")).toBe("Exported 3 synthetic records");
    expect(exportedRecords(3, "production")).toBe("Exported 3 records");
  });

  it("takes the copilot's peer summary figures from the bridge", async () => {
    const peer = finance.BRIDGES.find((b) => b.id === "peer")!;
    const volume = peer.steps.find((s) => s.label === "Volume")!;
    const old = volume.value;
    volume.value = -17;
    restore.push(() => (volume.value = old));
    const data = {
      finance: await demoRepo.finance.read(),
      models: await demoRepo.models.read(),
      datasets: await demoRepo.datasets.read(),
      crime: await demoRepo.crime.read(),
    };
    const a = answer("Why did credit revenue grow more slowly than peers?", data);
    expect(a.summary[0]).toContain("volume −$17.0M");
    expect(screen).toBeDefined();
  });
});
