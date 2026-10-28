import type { ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChartFrame } from "@/components/charts";
import { DataTable } from "@/components/DataTable";
import { EvidenceBadge, Kpi } from "@/components/kit";
import { DATA_STATES, type DataState } from "@/components/states";
import { TooltipProvider } from "@/components/ui/tooltip";

afterEach(cleanup);

const show = (ui: ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

const subjects: Record<string, { content: RegExp; ui: (s: DataState) => ReactElement }> = {
  Kpi: {
    content: /42\.0%/,
    ui: (s) => (
      <Kpi label="Approval rate" value="42.0%" definition="Approvals ÷ applications" state={s} />
    ),
  },
  DataTable: {
    content: /Row A/,
    ui: (s) => (
      <DataTable
        rows={[{ id: "a", name: "Row A" }]}
        columns={[{ key: "name", header: "Name" }]}
        rowKey={(r) => r.id}
        state={s}
      />
    ),
  },
  EvidenceBadge: {
    content: /Unverified/,
    ui: (s) => <EvidenceBadge state="UNVERIFIED" dataState={s} />,
  },
  ChartFrame: {
    content: /chart body/,
    ui: (s) => (
      <ChartFrame
        title="Credit revenue"
        unit="USD M"
        period="FY2025"
        source="Finance reporting (synthetic)"
        rows={[{ quarter: "Q1", value: 30 }]}
        state={s}
      >
        <p>chart body</p>
      </ChartFrame>
    ),
  },
};

const MARKERS =
  /Loading|for this selection|could not be loaded|do not have access|Stale data|Partial result/;

describe.each(Object.entries(subjects))("%s states", (_name, { content, ui }) => {
  it.each(DATA_STATES)("renders %s distinctly", (s) => {
    const { container } = show(ui(s));
    const text = container.textContent ?? "";
    switch (s) {
      case "loading":
        expect(screen.getByRole("status")).toHaveTextContent(/Loading/);
        expect(text).not.toMatch(content);
        break;
      case "empty":
        expect(text).toMatch(/for this selection/);
        expect(text).not.toMatch(content);
        break;
      case "error":
        expect(screen.getByRole("alert")).toHaveTextContent(/could not be loaded/);
        expect(text).not.toMatch(content);
        break;
      case "denied":
        expect(text).toMatch(/do not have access/);
        expect(text).not.toMatch(content);
        break;
      case "stale":
        expect(text).toMatch(content);
        expect(text).toMatch(/Stale data/);
        break;
      case "partial":
        expect(text).toMatch(content);
        expect(text).toMatch(/Partial result/);
        break;
      case "disabled":
        expect(text).toMatch(content);
        expect(container.querySelector('[aria-disabled="true"]')).not.toBeNull();
        break;
      case "success":
        expect(text).toMatch(content);
        expect(text).not.toMatch(MARKERS);
        expect(container.querySelector('[aria-disabled="true"]')).toBeNull();
        break;
    }
  });

  it("gives every state a different rendering", () => {
    const seen = DATA_STATES.map((s) => {
      const { container, unmount } = show(ui(s));
      const signature = `${container.textContent}|${container.querySelector('[aria-disabled="true"]') ? "disabled" : ""}`;
      unmount();
      return signature;
    });
    expect(new Set(seen).size).toBe(DATA_STATES.length);
  });
});

describe("ChartFrame", () => {
  it("states unit, period and source and offers the data as a table", () => {
    show(subjects["ChartFrame"]!.ui("success"));
    expect(
      screen.getByText(/USD M · FY2025 · Source: Finance reporting \(synthetic\)/),
    ).toBeInTheDocument();
    const table = screen.getByRole("table", { hidden: true });
    expect(table.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(table).toHaveTextContent("Q1");
  });

  it("does not compile without a unit", () => {
    const missingUnit = (
      // @ts-expect-error unit is required: no chart without a unit
      <ChartFrame title="t" period="p" source="s" rows={[]}>
        x
      </ChartFrame>
    );
    expect(missingUnit).toBeTruthy();
  });
});
