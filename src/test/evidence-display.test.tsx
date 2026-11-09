import { describe, expect, it } from "vitest";

import { PEERS } from "@/data/finance";
import { DEFINITIONS, type Definition, type DefinitionId } from "@/lib/definitions";
import { describeFigure, FigureSchema, peerFigure } from "@/lib/evidence";
import { clickTab, open, setUp } from "./a11y";

setUp();

// L4 T6e: the human's display decisions of T6c (C4, C17, C18).
const DAY = /\b\d{1,2} [A-Z][a-z]{2} \d{4}\b/;
const def = (id: string): Definition => DEFINITIONS[id as DefinitionId];

describe("screens from the human's T6c decisions (L4 T6e)", () => {
  it("C4: classes a synthetic figure as its own class, dated by its fiscal year, never confirmed", () => {
    const harborline = { ...PEERS.find((p) => p.id === "harborline")!, synthetic: true as const };
    const f = peerFigure(harborline, 3.31, "%");
    expect(FigureSchema.safeParse(f).success).toBe(true);
    expect(f.reliability).toBe("synthetic");
    expect(describeFigure(f)).toBe(
      "Synthetic, illustrative: Harborline Financial FY2025 public disclosure, FY2025 (synthetic)",
    );
  });

  it("C4, C17: no figure in the demo's peer table is classed confirmed or dated by a day", async () => {
    await open("/performance");
    await clickTab("Peer benchmarking");
    const cells = [...document.querySelectorAll("main figure table tbody tr")].map(
      (r) => r.lastElementChild?.textContent ?? "",
    );
    expect(cells.length).toBeGreaterThan(3);
    expect(cells.filter((c) => c.includes("Confirmed") || DAY.test(c))).toEqual([]);
    expect(cells.filter((c) => c.startsWith("Synthetic, illustrative")).length).toBeGreaterThan(2);
  });

  it("C18: every KPI tile this app computes lists each term of its formula as an input", async () => {
    const computed = Object.keys(DEFINITIONS).filter((id) => def(id).terms?.length);
    expect(computed.length).toBeGreaterThan(15);
    for (const path of ["/", "/performance", "/credit", "/crime", "/data", "/models"]) {
      await open(path);
      const missing = [...document.querySelectorAll<HTMLElement>("[data-definition]")].flatMap(
        (t) => {
          const id = t.dataset["definition"]!;
          const listed = (t.dataset["inputs"] ?? "").split("|");
          return (def(id).terms ?? []).filter((x) => !listed.includes(x)).map((x) => `${id}: ${x}`);
        },
      );
      expect(missing, path).toEqual([]);
    }
  });
});
