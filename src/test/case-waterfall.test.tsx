import { act, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { reconcileBridge } from "@/lib/calc";
import { caseBridge } from "@/lib/explain";
import { demoRepo } from "@/repo/demo";
import type { ModelExplanation } from "@/repo/types";

import { open, setUp } from "./a11y";

setUp();

const PATH = "/models/MDL-001?tab=explainability";
const r4 = (v: number) => Math.round(v * 10_000) / 10_000;
const frame = () => document.querySelector<HTMLElement>("[data-case-waterfall]")!;
const at = () => Number(frame().dataset["step"]);
const cumulative = () => Number(frame().dataset["cumulative"]);
const line = () => document.querySelector<HTMLElement>("[data-step-line]")!;
const button = (name: string) =>
  document.querySelector<HTMLButtonElement>(`[aria-label="${name}"]`)!;
const press = (name: string) => act(() => fireEvent.click(button(name)));

async function explanation() {
  return (await demoRepo.models.read()).explanations["MDL-001"]!;
}

function reduceMotion(on: boolean) {
  const mm = window.matchMedia;
  vi.spyOn(window, "matchMedia").mockImplementation((q) => ({
    ...mm(q),
    matches: on && q === "(prefers-reduced-motion: reduce)",
  }));
}

describe("case waterfall (L11 T3)", () => {
  it("builds every case as a bridge that reconciles, contributions largest first", async () => {
    const { explanations } = await demoRepo.models.read();
    for (const e of Object.values(explanations))
      for (const o of e.observations) {
        const b = caseBridge(e, o);
        expect(reconcileBridge(b).reconciles, `${e.model} ${o.id}`).toBe(true);
        expect(b.base).toBe(e.baseline);
        expect(b.actual).toBe(o.output);
        const sizes = b.steps.map((s) => Math.abs(s.value));
        expect(sizes).toEqual([...sizes].sort((x, y) => y - x));
      }
  });

  it("groups the tail past six steps as other features, and still reconciles", async () => {
    const e = await explanation();
    const extra = ["f6", "f7", "f8"];
    const wide: ModelExplanation = {
      ...e,
      features: [...e.features, ...extra],
      observations: e.observations.map((o, i) => {
        const more = Object.fromEntries(extra.map((f, j) => [f, r4(((i + j) % 5) * 0.01 - 0.02)]));
        const added = Object.values(more).reduce((s, v) => s + v, 0);
        return {
          ...o,
          values: { ...o.values, ...Object.fromEntries(extra.map((f) => [f, 1])) },
          contributions: { ...o.contributions, ...more },
          output: r4(o.output + added),
        };
      }),
    };
    const b = caseBridge(wide, wide.observations[0]!);
    expect(b.steps).toHaveLength(6);
    expect(b.steps.at(-1)!.label).toBe("other features (3)");
    expect(reconcileBridge(b).reconciles).toBe(true);
  });

  it("steps from the baseline: after step n the cumulative is the baseline plus the first n contributions, the last equals the output, reset returns", async () => {
    await open(PATH);
    const e = await explanation();
    const o = e.observations[0]!;
    const b = caseBridge(e, o);
    expect(at()).toBe(0);
    expect(cumulative()).toBe(e.baseline);
    for (let n = 1; n <= b.steps.length; n++) {
      press("Step forward");
      expect(at()).toBe(n);
      expect(cumulative()).toBe(
        r4(e.baseline + b.steps.slice(0, n).reduce((s, x) => s + x.value, 0)),
      );
      expect(line()).toHaveTextContent(b.steps[n - 1]!.label);
    }
    expect(cumulative()).toBe(o.output);
    expect(line()).toHaveTextContent("Output");
    expect(button("Step forward")).toBeDisabled();
    press("Step back");
    expect(at()).toBe(b.steps.length - 1);
    press("Reset");
    expect(at()).toBe(0);
    expect(cumulative()).toBe(e.baseline);
    expect(button("Step back")).toBeDisabled();
  });

  it("plays to the output, telling increase from decrease by sign and icon as well as colour", async () => {
    await open(PATH);
    const e = await explanation();
    const b = caseBridge(e, e.observations[0]!);
    press("Play");
    await waitFor(() => expect(at()).toBe(b.steps.length));
    expect(cumulative()).toBe(e.observations[0]!.output);
    press("Reset");
    for (const s of b.steps) {
      press("Step forward");
      const dir = s.value > 0 ? "up" : "down";
      expect(line().dataset["direction"]).toBe(dir);
      expect(line().querySelector(`svg[data-icon="${dir}"]`)).not.toBeNull();
      expect(line()).toHaveTextContent(s.value > 0 ? "raised" : "lowered");
    }
    const signs = [...document.querySelectorAll("[data-case-waterfall] table tbody tr")]
      .slice(1, -1)
      .map((r) => r.children[2]!.textContent![0]);
    expect(signs).toEqual(b.steps.map((s) => (s.value > 0 ? "+" : "−")));
  });

  it("shows the final state at once under reduced motion, and the step controls still work", async () => {
    reduceMotion(true);
    await open(PATH);
    const e = await explanation();
    const b = caseBridge(e, e.observations[0]!);
    expect(at()).toBe(b.steps.length);
    expect(cumulative()).toBe(e.observations[0]!.output);
    press("Step back");
    expect(at()).toBe(b.steps.length - 1);
    press("Play");
    expect(at()).toBe(b.steps.length);
    vi.restoreAllMocks();
  });

  it("selects a case and starts it from the baseline, with the caveat on screen", async () => {
    await open(PATH);
    const e = await explanation();
    const second = e.observations[1]!;
    press("Step forward");
    const select = document.querySelector<HTMLSelectElement>('select[aria-label="Case"]')!;
    expect(select.options).toHaveLength(e.observations.length);
    act(() => fireEvent.change(select, { target: { value: second.id } }));
    expect(at()).toBe(0);
    expect(cumulative()).toBe(e.baseline);
    for (const n of caseBridge(e, second).steps.keys()) {
      press("Step forward");
      expect(line()).toHaveTextContent(caseBridge(e, second).steps[n]!.label);
    }
    expect(cumulative()).toBe(second.output);
    expect(frame()).toHaveTextContent("not causes");
    expect(frame()).toHaveTextContent("decision support, not a credit decision");
    expect(frame()).toHaveTextContent("synthetic");
  });
});
