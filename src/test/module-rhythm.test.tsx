import { readdirSync } from "node:fs";
import { cleanup } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

const SAMPLE: Record<string, string> = {
  "crime.$id": "CASE-0917",
  "investigations.$id": "INV-2025-014",
  "models.$id": "MDL-002",
  "reports.$id": "RPT-FY25-PERF",
};

const PATHS = readdirSync("src/routes")
  .filter((f) => f.endsWith(".tsx") && f !== "__root.tsx")
  .map((f) => f.slice(0, -".tsx".length))
  .map(
    (r) =>
      "/" +
      r
        .split(".")
        .filter((s) => s !== "index")
        .map((s) => (s.startsWith("$") ? SAMPLE[r] : s))
        .join("/"),
  );

describe("module pages share the overview's rhythm", () => {
  it("covers every page route", () => {
    expect(PATHS.length).toBeGreaterThanOrEqual(12);
    expect(PATHS.filter((p) => p.includes("undefined"))).toEqual([]);
  });

  it("opens every page with the shared header: tag line, then the h1", async () => {
    const off: string[] = [];
    for (const path of PATHS) {
      cleanup();
      await open(path);
      const h1s = document.querySelectorAll("main h1");
      const header = h1s[0]?.closest("[data-page-header]");
      const tag =
        header &&
        [...header.querySelectorAll("span")].find((s) => s.textContent === "Synthetic demo data");
      if (h1s.length !== 1) off.push(`${path}: ${h1s.length} h1`);
      else if (!header) off.push(`${path}: h1 outside the page header`);
      else if (!tag || !(tag.compareDocumentPosition(h1s[0]!) & Node.DOCUMENT_POSITION_FOLLOWING))
        off.push(`${path}: tag line not above the h1`);
    }
    expect(off).toEqual([]);
  }, 120_000);

  it("groups every KPI in a shared band, not one card per figure", async () => {
    const off: string[] = [];
    for (const path of PATHS) {
      cleanup();
      await open(path);
      for (const el of document.querySelectorAll<HTMLElement>("main [data-definition]"))
        if (!el.closest("[data-kpi-band]")) off.push(`${path}: ${el.dataset["definition"]}`);
    }
    expect(off).toEqual([]);
  }, 120_000);
});
