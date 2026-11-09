import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PEERS, type Peer } from "@/data/finance";
import { describeFigure, FigureSchema, peerFigure } from "@/lib/evidence";
import { clickTab, open, setUp } from "./a11y";

setUp();

// A Radix popover opened in jsdom stalls the route renders after it in the same file, so
// clicking a number is tested on its own in evidence-ui-overview.test.tsx.
const panel = (title: string) =>
  [...document.querySelectorAll("section")].find(
    (s) => s.querySelector("h2")?.textContent === title,
  )?.textContent ?? "";
const frame = (title: string) =>
  [...document.querySelectorAll("figure")].find(
    (f) => f.querySelector("h2")?.textContent === title,
  )!;

describe("evidence UI (L4 T5)", () => {
  it("puts a synthetic watermark on every number and chart of the demo", async () => {
    await open("/");
    const marked = [
      ...document.querySelectorAll("[data-definition]"),
      ...document.querySelectorAll("main figure"),
    ];
    expect(marked.length).toBeGreaterThan(5);
    expect(
      marked
        .filter((e) => !e.querySelector("[data-synthetic]"))
        .map((e) => e.textContent?.slice(0, 40)),
    ).toEqual([]);
  });

  it("opens a finding's evidence when the finding is clicked", async () => {
    await open("/investigations/INV-2026-002");
    const claim = screen.getByRole("button", { name: /debt_service_coverage PSI exceeds 0\.10/ });
    expect(claim.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("region", { name: "Evidence for F-002-1" })).toBeNull();
    await act(async () => {
      fireEvent.click(claim);
    });
    const ev = screen.getByRole("region", { name: "Evidence for F-002-1" }).textContent;
    expect(ev).toContain("DS-012 AI model predictions · internal");
    expect(ev).toContain("gives 0.09");
    expect(ev).toContain("Claimed: above 0.1");
    expect(ev).toContain("A source gives a figure that is not above the claimed 0.1.");
  });

  it("keeps a finding's contradiction on screen without a click", async () => {
    await open("/investigations/INV-2026-002");
    expect(panel("Contradictory evidence")).toContain(
      "F-002-1: A source gives a figure that is not above the claimed 0.1.",
    );
  });

  it("keeps a finding's gap on screen beside the investigation's limitations", async () => {
    await open("/investigations/INV-2025-014");
    expect(panel("Limitations")).toContain(
      "F-014-2: Only third-party or synthetic sources support it.",
    );
  });

  it("says next to each peer figure how reliable it is", async () => {
    await open("/performance");
    await clickTab("Peer benchmarking");
    const table = frame("Net interest margin (%)").querySelector("table")!;
    expect([...table.querySelectorAll("th")].map((t) => t.textContent)).toContain(
      "How reliable is this figure?",
    );
    const row = (name: string) =>
      [...table.querySelectorAll("tbody tr")].find((r) => r.textContent?.startsWith(name))
        ?.textContent ?? "";
    expect(row("Harborline")).toContain(
      "Confirmed: Harborline Financial FY2025 public disclosure, as of 31 Dec 2025",
    );
    expect(row("Cascade")).toContain("Confirmed: Cascade Federal FY2025 licensed data");
    expect(row("Ironwood")).toContain("Not disclosed. Disclosed instead: nine-month FY2025");
    expect(row("Ironwood")).toContain("Unavailable");
    expect(row("Solent")).toContain("No reliable figure: Private institution");
  });

  it("gives every chart's table a reliability column, filled on every row", async () => {
    await open("/");
    const tables = [...document.querySelectorAll("main figure table")];
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) {
      expect([...t.querySelectorAll("th")].at(-1)?.textContent).toBe(
        "How reliable is this figure?",
      );
      for (const r of t.querySelectorAll("tbody tr"))
        expect(r.lastElementChild?.textContent).toMatch(/\S/);
    }
  });

  it("puts each reliability class in plain words", () => {
    expect(
      describeFigure({
        reliability: "confirmed",
        value: 3.31,
        unit: "%",
        sourceId: "Harborline Financial FY2025 public disclosure",
        asOf: "2025-12-31",
      }),
    ).toBe("Confirmed: Harborline Financial FY2025 public disclosure, as of 31 Dec 2025");
    expect(
      describeFigure({
        reliability: "third_party_estimate",
        estimator: "Acme Research",
        low: 140,
        high: 160,
        unit: "USD M",
        asOf: "2025-06-30",
      }),
    ).toBe("Estimate by Acme Research: 140 to 160 USD M, as of 30 Jun 2025");
    expect(
      describeFigure({
        reliability: "not_disclosed",
        disclosedInstead: "revenue",
        whyDifferent: "revenue is not valuation",
      }),
    ).toBe(
      "Not disclosed. Disclosed instead: revenue. Not the same figure: revenue is not valuation",
    );
    expect(describeFigure({ reliability: "unavailable", reason: "no permitted source" })).toBe(
      "No reliable figure: no permitted source",
    );
  });

  it("classes each peer figure by what its source gives, and never invents a number", () => {
    const p = (id: string) => PEERS.find((x) => x.id === id)!;
    expect(peerFigure(p("harborline"), 3.31, "%")).toMatchObject({
      reliability: "confirmed",
      value: 3.31,
      asOf: "2025-12-31",
    });
    expect(peerFigure(p("ironwood"), p("ironwood").nim, "%").reliability).toBe("not_disclosed");
    expect(peerFigure(p("solent"), null, "%").reliability).toBe("unavailable");
    expect(peerFigure(p("ironwood"), null, "%").reliability).toBe("not_disclosed");
    const metrics: (keyof Peer)[] = ["nim", "cir", "roe", "roa", "creditGrowth", "depositGrowth"];
    for (const peer of PEERS)
      for (const m of metrics) {
        const f = peerFigure(peer, peer[m] as number | null, "%");
        expect(FigureSchema.safeParse(f).success, `${peer.id} ${m}`).toBe(true);
        if (peer[m] === null) expect(f.reliability, `${peer.id} ${m}`).not.toBe("confirmed");
      }
  });
});
