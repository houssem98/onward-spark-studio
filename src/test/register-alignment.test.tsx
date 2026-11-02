import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

// A quantity: optional sign and currency, digits with thousands separators, optional decimals
// and unit suffix. Versions (3.2.0), dates, identifiers and "N/A" are not quantities.
const QUANTITY = /^[−+-]?(?:[$€£]\s?)?\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s?(?:%|pp|bp|M|B|K|d|x))?$/;

const PATHS: Record<string, string> = {
  "crime.$id": "/crime/CASE-0917",
  "investigations.$id": "/investigations/INV-2025-014",
  "models.$id": "/models/MDL-002",
  "reports.$id": "/reports/RPT-FY25-PERF",
};
const routes = readdirSync(join(process.cwd(), "src/routes"))
  .filter((f) => f.endsWith(".tsx") && f !== "__root.tsx")
  .map((f) => f.slice(0, -".tsx".length));
const pathOf = (r: string) =>
  PATHS[r] ??
  "/" +
    r
      .split(".")
      .filter((s) => s !== "index")
      .join("/");

describe("registers", () => {
  it.each(routes)("%s right-aligns numeric columns with tabular figures", async (route) => {
    await open(pathOf(route));
    const bad: string[] = [];
    // Registers are the DataTable tables: their headers are sort buttons.
    const tables = [...document.querySelectorAll("main table")].filter((t) =>
      t.querySelector("thead th button"),
    );
    for (const table of tables) {
      const headers = [...table.querySelectorAll("thead th")].map((th) => th.textContent ?? "");
      const rows = [...table.querySelectorAll("tbody tr")].map((tr) => [
        ...tr.querySelectorAll("td"),
      ]);
      headers.forEach((header, i) => {
        const cells = rows.map((r) => r[i]).filter((td): td is HTMLTableCellElement => !!td);
        const filled = cells.filter((td) => !["", "—"].includes((td.textContent ?? "").trim()));
        if (filled.length === 0) return;
        if (!filled.every((td) => QUANTITY.test((td.textContent ?? "").trim()))) return;
        if (
          !cells.every((td) => td.classList.contains("text-right") && td.classList.contains("num"))
        )
          bad.push(`${header}: numeric but not right-aligned tabular`);
      });
    }
    expect(bad).toEqual([]);
  });
});
