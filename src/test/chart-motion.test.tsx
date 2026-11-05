import { readdirSync } from "node:fs";
import type { ReactNode } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clickTab, open, setUp } from "./a11y";

// Recharts draws nothing in jsdom, so its charts become pass-throughs and each series records
// the props it was handed.
const seen = vi.hoisted(() => ({
  where: "",
  series: [] as { where: string; type: string; props: Record<string, unknown> }[],
}));
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  const pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const none = () => null;
  const record = (type: string) =>
    function Series(props: Record<string, unknown>) {
      seen.series.push({ where: seen.where, type, props });
      return null;
    };
  return {
    ...actual,
    ResponsiveContainer: pass,
    AreaChart: pass,
    BarChart: pass,
    LineChart: pass,
    ScatterChart: pass,
    Area: record("Area"),
    Bar: record("Bar"),
    Line: record("Line"),
    Scatter: record("Scatter"),
    CartesianGrid: none,
    Cell: none,
    LabelList: none,
    Legend: none,
    ReferenceLine: none,
    Tooltip: none,
    XAxis: none,
    YAxis: none,
  };
});

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

function reduceMotion(on: boolean) {
  const mm = window.matchMedia;
  vi.spyOn(window, "matchMedia").mockImplementation((q) => ({
    ...mm(q),
    matches: on && q === "(prefers-reduced-motion: reduce)",
  }));
}

/**
 * Every route, and every tab on it, so charts on tabs other than the first are seen too. Fails on
 * a React key warning, since handing series their settings rebuilds the chart's children.
 */
async function walk() {
  seen.series.length = 0;
  const error = vi.spyOn(console, "error");
  for (const path of PATHS) {
    cleanup();
    seen.where = path;
    await open(path);
    const tabs = [...document.querySelectorAll('main [role="tab"]')];
    for (const tab of tabs.slice(1)) {
      seen.where = `${path} › ${tab.textContent?.trim()}`;
      await clickTab(tab);
    }
  }
  expect(
    error.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('unique "key"')),
  ).toEqual([]);
  return seen.series.map((s) => ({ ...s, label: `${s.where}: ${s.type} ${s.props["dataKey"]}` }));
}

/**
 * The root route renders <html>, and React then owns its attributes, so an inline custom property
 * there is wiped; the token reaches the computed style instead, written in seconds as the built
 * CSS writes it.
 */
function dataToken(value: string) {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
    const style = real(el, pseudo);
    if (el !== document.documentElement) return style;
    return new Proxy(style, {
      get: (t, k) => {
        if (k === "getPropertyValue")
          return (n: string) => (n === "--duration-data" ? value : t.getPropertyValue(n));
        const v: unknown = Reflect.get(t, k);
        return typeof v === "function" ? v.bind(t) : v;
      },
    });
  });
}

afterEach(() => vi.restoreAllMocks());

describe("chart motion", () => {
  it("turns every series' animation off under reduced motion", async () => {
    reduceMotion(true);
    dataToken(".5s");
    const series = await walk();
    expect(series.length).toBeGreaterThan(20);
    expect(
      series.filter((s) => s.props["isAnimationActive"] !== false).map((s) => s.label),
    ).toEqual([]);
  }, 180_000);

  it("animates every series at --duration-data otherwise, except the bridge waterfall, rule 3's one exception", async () => {
    reduceMotion(false);
    dataToken(".5s");
    const series = await walk();
    const animated = series.filter((s) => s.props["isAnimationActive"] === true);
    expect(animated.length).toBeGreaterThan(20);
    // The waterfall's steps float on transparent offset bars; grown from the axis they would show
    // steps that are not there mid-flight. Its two stacked bars are the only series that stand still.
    const still = series.filter((s) => s.props["isAnimationActive"] === false);
    expect(still.length, "the bridge waterfall is drawn and stands still").toBeGreaterThanOrEqual(
      2,
    );
    expect(
      still
        .filter(
          (s) =>
            s.type !== "Bar" ||
            s.props["stackId"] !== "a" ||
            !["offset", "value"].includes(String(s.props["dataKey"])) ||
            (s.props["dataKey"] === "offset" && s.props["fill"] !== "transparent"),
        )
        .map((s) => s.label),
    ).toEqual([]);
    expect(
      series
        .filter(
          (s) =>
            s.props["isAnimationActive"] === undefined ||
            (s.props["isAnimationActive"] === true && s.props["animationDuration"] !== 500),
        )
        .map(
          (s) =>
            `${s.label} ${String(s.props["isAnimationActive"])} ${String(s.props["animationDuration"])}`,
        ),
    ).toEqual([]);
  }, 180_000);
});
