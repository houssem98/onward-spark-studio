import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { Journey } from "@/components/explain";
import { demoRepo } from "@/repo/demo";

import { open, setUp } from "./a11y";

setUp();

// The journey order of docs/roadmap/DESIGN_MOTION_ROADMAP.md: inputs and data quality, prediction,
// global importance, beeswarm, case waterfall, review.
const ORDER = [
  "Inputs and data quality",
  "Prediction",
  "Global importance",
  "Contributions by case",
  "Case explanation",
  "Review",
] as const;
const STATUS = { loading: "Loading", success: "Complete", empty: "Unavailable", error: "Failed" };

const stages = () => [...document.querySelectorAll<HTMLElement>("[data-stage]")];
const stage = (title: string) => document.querySelector<HTMLElement>(`[data-stage="${title}"]`)!;
const pct = (logOdds: number) => `${(100 / (1 + Math.exp(-logOdds))).toFixed(1)}%`;

describe("explanation journey (L11 T5)", () => {
  it("reads in the journey order, every explanation stage complete and review pending until a decision is recorded", async () => {
    await open("/models/MDL-001?tab=explainability");
    expect(stages().map((s) => s.dataset["stage"])).toEqual([...ORDER]);
    for (const s of stages().slice(0, -1)) {
      expect(s.dataset["state"]).toBe("success");
      expect(s).toHaveTextContent("Complete");
    }
    // MDL-001 has no recorded decision (T9, council C12).
    expect(stages().at(-1)!.dataset["state"]).toBe("pending");
    expect(stages().at(-1)).toHaveTextContent("Not reviewed");
  });

  it("states the inputs and the prediction from the same rows the charts read", async () => {
    await open("/models/MDL-001?tab=explainability");
    const e = (await demoRepo.models.read()).explanations["MDL-001"]!;
    const inputs = [...stage("Inputs and data quality").querySelectorAll("tbody tr")];
    expect(inputs.map((r) => r.children[0]!.textContent)).toEqual(e.features);
    for (const [i, f] of e.features.entries()) {
      const vs = e.observations.map((o) => o.values[f]!);
      const cells = [...inputs[i]!.children].map((c) => c.textContent);
      expect(cells[1]).toBe(e.definitions[f]);
      expect(cells[2]).toBe(`${Math.min(...vs)} to ${Math.max(...vs)}`);
      expect(cells[3]).toBe("0");
    }
    const outputs = e.observations.map((o) => o.output).sort((a, b) => a - b);
    const prediction = stage("Prediction");
    expect(prediction).toHaveTextContent(`${e.observations.length} synthetic cases`);
    expect(prediction).toHaveTextContent(`baseline ${pct(e.baseline)}`);
    expect(prediction).toHaveTextContent(`${pct(outputs[0]!)} to ${pct(outputs.at(-1)!)}`);
    expect(prediction).toHaveTextContent("decision support, not a credit decision");
    expect(
      stage("Review").querySelector('a[href="/models/MDL-001?tab=governance"]'),
    ).not.toBeNull();
  });

  it("shows each state distinctly in every stage", () => {
    const bodies = Object.fromEntries(ORDER.map((t) => [t, <p data-body>{t}</p>])) as Record<
      (typeof ORDER)[number],
      ReactNode
    >;
    for (const [state, word] of Object.entries(STATUS)) {
      cleanup();
      render(<Journey state={state as keyof typeof STATUS} stages={bodies} />);
      expect(stages().map((s) => s.dataset["stage"])).toEqual([...ORDER]);
      for (const s of stages()) {
        expect(s.dataset["state"]).toBe(state);
        expect(s).toHaveTextContent(word);
        expect(s.querySelector("[data-body]") !== null).toBe(state === "success");
        expect(s.querySelector('[role="status"][aria-busy="true"]') !== null).toBe(
          state === "loading",
        );
        expect(s.querySelector('[role="alert"]') !== null).toBe(state === "error");
      }
    }
  });

  it("keeps the honest empty state, once, for a model without explanations", async () => {
    await open("/models/MDL-003?tab=explainability");
    expect(stages().map((s) => s.dataset["state"])).toEqual(ORDER.map(() => "empty"));
    const note = "Explainability evidence is not available for this model type.";
    const main = document.querySelector("main")!.textContent!;
    expect(main.split(note)).toHaveLength(2);
    expect(document.querySelector("svg[data-beeswarm], [data-case-waterfall]")).toBeNull();
  });

  it("links the credit page to the explanation of each explained credit model", async () => {
    const { models, explanations } = await demoRepo.models.read();
    await open("/credit");
    for (const id of Object.keys(explanations)) {
      const link = document.querySelector(`a[href="/models/${id}?tab=explainability"]`);
      expect(link, id).not.toBeNull();
      expect(link).toHaveTextContent(models.find((m) => m.id === id)!.name);
    }
  });
});
