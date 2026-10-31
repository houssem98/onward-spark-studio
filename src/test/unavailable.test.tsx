import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartFrame } from "@/components/charts";
import { Kpi } from "@/components/kit";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fmtPct, growth, pct } from "@/lib/calc";

describe("a value with a zero denominator", () => {
  it("shows as Unavailable in a KPI, with an uncoloured delta", () => {
    render(
      <TooltipProvider>
        <Kpi
          def="npl_ratio"
          value={fmtPct(pct(1, 0), 2)}
          delta={`${fmtPct(growth(1, 0))} YoY`}
          deltaGood
        />
      </TooltipProvider>,
    );
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Unavailable YoY").className).not.toMatch(/text-success|text-critical/);
  });

  it("shows as Unavailable in a chart frame's table", () => {
    render(
      <ChartFrame title="NPL" unit="%" period="FY2025" source="Test" rows={[{ k: "A", v: null }]}>
        <div />
      </ChartFrame>,
    );
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });
});
