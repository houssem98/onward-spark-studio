import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CaseWaterfall, InputsStage, PredictionStage } from "@/components/explain";
import { fmtSigned } from "@/lib/calc";
import { caseBridge, stepLine } from "@/lib/explain";
import { demoRepo } from "@/repo/demo";
import type { ModelExplanation } from "@/repo/types";

import { open, setUp } from "./a11y";

setUp();

// L11 T8: the council's findings on figures (C1, C2, C3, C4, C6, C13, C14, C15), each reproduced.
const PATH = "/models/MDL-001?tab=explainability";
const read = async () => (await demoRepo.models.read()).explanations["MDL-001"]!;
const stage = (title: string) => document.querySelector<HTMLElement>(`[data-stage="${title}"]`)!;
const pct = (logOdds: number) => `${(100 / (1 + Math.exp(-logOdds))).toFixed(1)}%`;
const headers = (t: Element) => [...t.querySelectorAll("thead th")].map((h) => h.textContent);

describe("council fixes: figures (L11 T8)", () => {
  it("C1: a case states whether it reconciles, by the bridge rule at run time", async () => {
    const e = await read();
    const { unmount } = render(<CaseWaterfall explanation={e} />);
    expect(document.querySelector("[data-reconcile]")).toHaveTextContent("reconciles");
    expect(document.querySelector("[data-reconcile]")).not.toHaveTextContent("does not reconcile");
    unmount();
    const [first, ...rest] = e.observations;
    const off: ModelExplanation = {
      ...e,
      observations: [{ ...first!, output: first!.output + 0.01 }, ...rest],
    };
    render(<CaseWaterfall explanation={off} />);
    expect(document.querySelector("[data-reconcile]")).toHaveTextContent("does not reconcile");
  });

  it("C2: the tab says which version it explains when another is selected", async () => {
    await open(PATH);
    const e = await read();
    const select = [...document.querySelectorAll("select")].find((s) =>
      s.closest("label")?.textContent?.includes("Version"),
    )!;
    const other = [...select.options].map((o) => o.value).find((v) => v !== e.version)!;
    expect(document.querySelector("[data-version-note]")).toBeNull();
    // The selection is written through the repository, so the page answers a moment later.
    await act(async () => fireEvent.change(select, { target: { value: other } }));
    await waitFor(() => expect(document.querySelector("[data-version-note]")).not.toBeNull());
    const note = document.querySelector("[data-version-note]");
    expect(note).toHaveTextContent(e.version);
    expect(note).toHaveTextContent(other);
    await act(async () => fireEvent.change(select, { target: { value: e.version } }));
    await waitFor(() => expect(document.querySelector("[data-version-note]")).toBeNull());
  });

  it("C3: the beeswarm's table carries each case's feature values", async () => {
    await open(PATH);
    const e = await read();
    const table = stage("Contributions by case").querySelector("table")!;
    const cols = headers(table);
    for (const [i, row] of [...table.querySelectorAll("tbody tr")].entries()) {
      const o = e.observations[i]!;
      for (const f of e.features)
        expect(row.children[cols.indexOf(`${f} value`)]!.textContent).toBe(String(o.values[f]));
    }
  });

  it("C4: the importance frame names the fixture, the model version and the log-odds scale", async () => {
    await open(PATH);
    const e = await read();
    const caption = stage("Global importance").querySelector("figcaption")!;
    expect(caption).toHaveTextContent(e.source);
    expect(caption).toHaveTextContent(`${e.model} ${e.version}`);
    expect(caption).toHaveTextContent("log-odds");
    expect(caption).not.toHaveTextContent("Validation sample");
  });

  it("C6: the prediction median is the true median of an even count", async () => {
    const e = await read();
    const two = {
      ...e,
      observations: [-1, 1].map((output, i) => ({ ...e.observations[i]!, output })),
    };
    render(<PredictionStage explanation={two} />);
    expect(document.body).toHaveTextContent("median 50.0%");
    const outs = e.observations.map((o) => o.output).sort((a, b) => a - b);
    const n = outs.length;
    const median = n % 2 ? outs[(n - 1) / 2]! : (outs[n / 2 - 1]! + outs[n / 2]!) / 2;
    render(<PredictionStage explanation={e} />);
    expect(document.body).toHaveTextContent(`median ${pct(median)}`);
  });

  it("C13: the inputs table states its source and shows a feature with no values as unavailable", async () => {
    const e = await read();
    const blank: ModelExplanation = {
      ...e,
      features: [...e.features, "f_blank"],
      definitions: { ...e.definitions, f_blank: "A feature with no recorded values." },
    };
    render(<InputsStage explanation={blank} />);
    const row = [...document.querySelectorAll("tbody tr")].find(
      (r) => r.children[0]!.textContent === "f_blank",
    )!;
    expect(row.children[2]!.textContent).toBe("Unavailable");
    expect(document.body).not.toHaveTextContent("Infinity");
    expect(document.body).toHaveTextContent(`Source: ${e.source}`);
    expect(document.body).toHaveTextContent("synthetic");
  });

  it("C14: a value reads the same in a chart and its table, and the axis ends at the table's figure", async () => {
    await open(PATH);
    const e = await read();
    const frame = stage("Global importance");
    const bars = [...frame.querySelectorAll<HTMLElement>("[data-importance-bar]")];
    const cells = [...frame.querySelectorAll("table tbody tr")].map(
      (r) => r.children[1]!.textContent,
    );
    expect(bars.map((b) => b.lastElementChild!.textContent)).toEqual(cells);
    const m = Math.max(
      ...e.observations.flatMap((o) => Object.values(o.contributions).map(Math.abs)),
    );
    const ticks = [...document.querySelectorAll("svg[data-beeswarm] > text")].map(
      (t) => t.textContent,
    );
    expect(ticks).toEqual([fmtSigned(-m, 4), "0", fmtSigned(m, 4)]);
  });

  it("C15: a zero step is neither raised nor lowered, and every signed figure carries its sign", async () => {
    const e = await read();
    const o = e.observations[0]!;
    const zero = { ...e, baseline: 0.5 };
    const b = {
      ...caseBridge(zero, o),
      base: 0.5,
      steps: [{ label: e.features[0]!, value: 0, kind: "measured" as const }],
      actual: 0.5,
    };
    const line = stepLine(b, o, 1);
    expect(line).toContain("unchanged");
    expect(line).not.toMatch(/raised|lowered/);
    expect(line).toContain("+0.5000");
    expect(stepLine(b, o, 0)).toContain("+0.5000");
  });
});
