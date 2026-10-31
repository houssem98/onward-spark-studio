import { describe, expect, it, vi } from "vitest";

import { BRIDGES } from "@/data/finance";
import {
  classificationMetrics,
  costToIncome,
  diff,
  downloadFile,
  fmtFixed,
  fmtM,
  fmtNum,
  fmtPct,
  fmtSigned,
  growth,
  pct,
  psi,
  psiBand,
  reconcileBridge,
  round,
  sum,
  toCSV,
  waterfallRows,
  type Bridge,
} from "@/lib/calc";

const bridge = (base: number, actual: number, values: number[]): Bridge => ({
  id: "test",
  method: "test",
  period: "test",
  baseLabel: "Base",
  base,
  actualLabel: "Actual",
  actual,
  steps: values.map((value, i) => ({ label: `S${i}`, value, kind: "measured" })),
});

describe("zero denominators are unavailable, never 0 or NaN", () => {
  it("returns null from pct, growth and costToIncome", () => {
    expect(pct(5, 0)).toBeNull();
    expect(pct(0, 0)).toBeNull();
    expect(growth(5, 0)).toBeNull();
    expect(growth(0, 0)).toBeNull();
    expect(costToIncome(60, 0)).toBeNull();
  });

  it("returns null from a classification metric only when its denominator is zero", () => {
    expect(classificationMetrics(0, 0, 0, 0)).toEqual({
      precision: null,
      recall: null,
      f1: null,
      accuracy: null,
    });
    expect(classificationMetrics(0, 0, 0, 10)).toEqual({
      precision: null,
      recall: null,
      f1: null,
      accuracy: 1,
    });
    // No true positives is a real score of 0, not 0/0.
    expect(classificationMetrics(0, 5, 5, 90)).toEqual({
      precision: 0,
      recall: 0,
      f1: 0,
      accuracy: 0.9,
    });
  });

  it("carries null through round and diff, and formats it as Unavailable", () => {
    expect(round(null, 2)).toBeNull();
    expect(diff(null, 1)).toBeNull();
    expect(diff(1, null)).toBeNull();
    expect(diff(3, 1)).toBe(2);
    expect(fmtPct(null)).toBe("Unavailable");
    expect(fmtFixed(null, 2, "pp")).toBe("Unavailable");
  });
});

describe("ratios", () => {
  it("computes percentages, growth and cost-to-income", () => {
    expect(pct(1, 4)).toBe(25);
    expect(pct(-1, 4)).toBe(-25);
    expect(growth(110, 100)).toBeCloseTo(10, 10);
    expect(growth(0, 100)).toBe(-100);
    expect(costToIncome(60, 100)).toBe(60);
  });

  it("computes classification metrics from the confusion counts", () => {
    const m = classificationMetrics(80, 20, 10, 890);
    expect(m.precision).toBeCloseTo(0.8, 10);
    expect(m.recall).toBeCloseTo(80 / 90, 10);
    expect(m.f1).toBeCloseTo((2 * 0.8 * (80 / 90)) / (0.8 + 80 / 90), 10);
    expect(m.accuracy).toBeCloseTo(0.97, 10);
  });

  it("sums, including an empty list", () => {
    expect(sum([])).toBe(0);
    expect(sum([1, 2, 3.5])).toBe(6.5);
  });
});

describe("round", () => {
  it("rounds half away from zero, also where binary floats fall short", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(-1.005, 2)).toBe(-1.01);
    expect(round(2.675, 2)).toBe(2.68);
    expect(round(2.5, 0)).toBe(3);
    expect(round(-2.5, 0)).toBe(-3);
    expect(round(0.99995, 4)).toBe(1);
    expect(round(1.24)).toBe(1.2);
  });

  it("never returns negative zero", () => {
    expect(Object.is(round(-0.04, 1), 0)).toBe(true);
  });
});

describe("reconcileBridge", () => {
  it("reconciles through binary noise", () => {
    expect(reconcileBridge(bridge(100, 100.3, [0.1, 0.2]))).toEqual({
      gap: 0.3,
      explained: 0.3,
      difference: 0,
      reconciles: true,
    });
  });

  it("reconciles negative steps", () => {
    expect(reconcileBridge(bridge(150, 120, [-18, -7, -3, -2]))).toEqual({
      gap: -30,
      explained: -30,
      difference: 0,
      reconciles: true,
    });
  });

  it("decides at 4 dp on the difference itself, not on separately rounded totals", () => {
    // 1.00004 and 1.00008 round apart at 4 dp, yet differ by less than 0.00005.
    expect(reconcileBridge(bridge(0, 1.00004, [1.00008])).reconciles).toBe(true);
    expect(reconcileBridge(bridge(0, -1.00004, [-1.00008])).reconciles).toBe(true);
    expect(reconcileBridge(bridge(0, 1, [0.9999]))).toMatchObject({
      difference: 0.0001,
      reconciles: false,
    });
    expect(reconcileBridge(bridge(0, -1, [-0.9999]))).toMatchObject({
      difference: -0.0001,
      reconciles: false,
    });
  });

  it("reconciles every demo bridge", () => {
    for (const b of BRIDGES) expect(reconcileBridge(b).reconciles, b.id).toBe(true);
  });
});

describe("waterfallRows", () => {
  const b = bridge(150, 120, [-18, -7, 5, -10]);
  const rows = waterfallRows(b);

  it("starts at the base and ends at the actual, with one row per step", () => {
    expect(rows.map((r) => r.name)).toEqual(["Base", "S0", "S1", "S2", "S3", "Actual"]);
    expect(rows[0]).toMatchObject({ offset: 0, value: 150, type: "total" });
    expect(rows.at(-1)).toMatchObject({ offset: 0, value: 120, type: "total" });
  });

  it("sums to the actual and draws each step from the running total", () => {
    expect(sum(rows.slice(0, -1).map((r) => r.signed))).toBe(rows.at(-1)!.signed);
    let running = b.base;
    for (const r of rows.slice(1, -1)) {
      const next = running + r.signed;
      expect([r.offset, r.offset + r.value]).toEqual([
        Math.min(running, next),
        Math.max(running, next),
      ]);
      expect(r.type).toBe(r.signed >= 0 ? "up" : "down");
      running = next;
    }
  });

  it("marks residual steps", () => {
    const r = waterfallRows({ ...b, steps: [{ label: "R", value: -30, kind: "residual" }] });
    expect(r[1]!.type).toBe("residual");
  });
});

describe("psi", () => {
  it("is zero for identical bins and follows the formula otherwise", () => {
    expect(psi([0.5, 0.5], [0.5, 0.5])).toBe(0);
    expect(psi([0.5, 0.5], [0.6, 0.4])).toBeCloseTo(0.1 * Math.log(1.2) + 0.1 * Math.log(1.25), 10);
  });

  it("stays finite with zero bins", () => {
    expect(psi([0, 1], [0, 1])).toBe(0);
    expect(psi([0, 1], [0.5, 0.5])).toBeGreaterThan(0.25);
    expect(Number.isFinite(psi([0.5, 0.5], [0, 1]))).toBe(true);
  });

  it("throws when the bin counts differ", () => {
    expect(() => psi([0.5, 0.5], [1])).toThrow("psi: bin counts differ");
  });

  it("bands at 0.10 and 0.25", () => {
    expect([0, 0.0999, 0.1, 0.2499, 0.25, 1].map((v) => psiBand(v))).toEqual([
      "Stable",
      "Stable",
      "Moderate shift",
      "Moderate shift",
      "Significant shift",
      "Significant shift",
    ]);
  });
});

describe("formatters", () => {
  it("formats money, percentages, fixed values, counts and signed values", () => {
    expect(fmtM(1234.56)).toBe("$1,234.6M");
    expect(fmtM(-5, 0)).toBe("−$5M");
    expect(fmtPct(12.34)).toBe("12.3%");
    expect(fmtPct(2.5, 2)).toBe("2.50%");
    expect(fmtFixed(0.1234, 2, "pp")).toBe("0.12pp");
    expect(fmtFixed(0.8)).toBe("0.8");
    expect(fmtNum(1234567)).toBe("1,234,567");
    expect(fmtSigned(1.26)).toBe("+1.3");
    expect(fmtSigned(-2)).toBe("−2.0");
    expect(fmtSigned(0)).toBe("0.0");
  });
});

describe("toCSV", () => {
  it("writes a header from the first row and quotes commas, quotes and newlines", () => {
    expect(toCSV([])).toBe("");
    expect(
      toCSV([
        { a: 1, b: 'say "hi", twice' },
        { a: null, b: "x\ny" },
      ]),
    ).toBe('a,b\n1,"say ""hi"", twice"\n,"x\ny"');
  });
});

describe("downloadFile", () => {
  it("downloads the content under its name and releases the object URL", () => {
    const blobs: Blob[] = [];
    const revoke = vi.fn();
    Object.assign(URL, {
      createObjectURL: (b: Blob) => {
        blobs.push(b);
        return "blob:test";
      },
      revokeObjectURL: revoke,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    downloadFile("a.csv", "x,y");
    const clicked = click.mock.contexts[0] as HTMLAnchorElement;
    expect(clicked.download).toBe("a.csv");
    expect(clicked.href).toBe("blob:test");
    expect(blobs.map((b) => b.type)).toEqual(["text/csv"]);
    expect(revoke).toHaveBeenCalledWith("blob:test");
    click.mockRestore();
  });
});
