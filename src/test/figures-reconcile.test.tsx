import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import * as credit from "@/data/credit";
import * as datasets from "@/data/datasets";
import * as finance from "@/data/finance";
import { round } from "@/lib/calc";
import { demoRepo } from "@/repo/demo";
import { clickTab, open, setUp } from "./a11y";

setUp();

// Each test changes the fixture the repository serves, then checks the page follows it.
const restore: (() => void)[] = [];
function patch<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]) {
  const old = obj[key];
  obj[key] = value;
  restore.push(() => (obj[key] = old));
}
afterEach(() => {
  while (restore.length) restore.pop()!();
});

const tile = (def: string) => document.querySelector(`[data-definition="${def}"]`)?.textContent;
const creditDept = finance.DEPARTMENTS.find((d) => d.id === "credit")!;

describe("figures that foot and reconcile", () => {
  it("foots the quarterly table at the decimal it shows", async () => {
    const { quarterlyRevenue } = await demoRepo.finance.read();
    const off = quarterlyRevenue
      .filter((r) => round(Number(r["total"]) - Number(r["expenses"]), 1) !== r["profit"])
      .map((r) => `${r["quarter"]}: ${r["total"]} − ${r["expenses"]} ≠ ${r["profit"]}`);
    expect(off).toEqual([]);
  });

  it.each(["/", "/data"])(
    "shows the dimension mean as Unavailable on %s when none is measurable",
    async (path) => {
      for (const d of datasets.DQ_DIMENSIONS) patch(d, "score", null);
      await open(path);
      expect(tile("dq_dimension_mean")).toContain("Unavailable");
      expect(tile("dq_dimension_mean")).not.toContain("NaN");
    },
  );

  it("shows the average loan size as Unavailable when no slice has a loan", async () => {
    for (const s of credit.SLICES) patch(s, "loans", 0);
    await open("/credit");
    expect(tile("avg_loan_size")).toContain("Unavailable");
  });

  it("takes Northstar's credit revenue in the peer chart from the repository", async () => {
    patch(creditDept, "revenue", 125);
    await open("/performance");
    await clickTab("Peer benchmarking");
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Metric"), { target: { value: "creditRevenue" } });
    });
    const row = [...document.querySelectorAll("tr")].find((r) =>
      r.textContent?.startsWith(finance.BANK.short),
    );
    expect(row?.textContent).toContain("125");
  });

  it("takes the scorecard's freshness from the finance dataset", async () => {
    patch(
      datasets.DATASETS.find((d) => d.id === "DS-009")!,
      "lastRefresh",
      "2026-01-11 06:00",
    );
    await open("/performance");
    expect(screen.getByText(/Freshness:/).textContent).toContain("2026-01-11");
  });

  it("reconciles credit portfolio revenue to the credit division's operating income", async () => {
    await open("/credit");
    expect(screen.getByText(/Control:/).textContent).toMatch(/reconciles to/);
    const { cleanup } = await import("@testing-library/react");
    cleanup();
    patch(creditDept, "revenue", 125);
    await open("/credit");
    expect(screen.getByText(/Control:/).textContent).toMatch(/does not reconcile/);
  });

  it("counts the peers that report credit revenue in the wizard", async () => {
    patch(
      finance.PEERS.find((p) => p.id === "meridian")!,
      "creditRevenue",
      null,
    );
    await open("/performance");
    await clickTab("Root-cause engine");
    for (let i = 0; i < 3; i++)
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
      });
    expect(screen.getByText(/peers report credit revenue/).textContent).toContain(
      "2 of 5 peers report credit revenue",
    );
    // A route render, a tab and three wizard steps: past the 5 s default under a loaded gate.
  }, 30_000);
});
