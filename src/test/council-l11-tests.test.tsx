import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CaseWaterfall, InputsStage } from "@/components/explain";
import { demoRepo } from "@/repo/demo";

import { setUp } from "./a11y";

setUp();
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// L11 T10: the council's findings on tests that could not fail (C10, C11); C7 grew
// src/test/honest-copy.test.ts and C18 is in e2e/explain.spec.ts.
const read = async () => (await demoRepo.models.read()).explanations["MDL-001"]!;
const step = () => document.querySelector<HTMLElement>("[data-case-waterfall]")!.dataset["step"];

describe("council fixes: tests that bite (L11 T10)", () => {
  it("C10: the missing count counts a case with no value for a feature", async () => {
    const e = await read();
    const [first, ...rest] = e.observations;
    const gone = e.features[0]!;
    const values = Object.fromEntries(Object.entries(first!.values).filter(([f]) => f !== gone));
    render(<InputsStage explanation={{ ...e, observations: [{ ...first!, values }, ...rest] }} />);
    const row = [...document.querySelectorAll("tbody tr")].find(
      (r) => r.children[0]!.textContent === gone,
    )!;
    expect(row.children[3]!.textContent).toBe("1");
  });

  it("C11: each played step holds for two data durations, not less", async () => {
    // jsdom applies no stylesheet, so the motion token is given here: 500 ms, as in the app.
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
      const style = real(el, pseudo);
      return new Proxy(style, {
        get: (t, k) =>
          k === "getPropertyValue"
            ? (name: string) => (name === "--duration-data" ? "500ms" : t.getPropertyValue(name))
            : typeof Reflect.get(t, k) === "function"
              ? (Reflect.get(t, k) as (...a: unknown[]) => unknown).bind(t)
              : Reflect.get(t, k),
      });
    });
    vi.useFakeTimers();
    render(<CaseWaterfall explanation={await read()} />);
    act(() => fireEvent.click(document.querySelector('[aria-label="Play"]')!));
    act(() => void vi.advanceTimersByTime(999));
    expect(step()).toBe("0");
    act(() => void vi.advanceTimersByTime(1));
    expect(step()).toBe("1");
    act(() => void vi.advanceTimersByTime(999));
    expect(step()).toBe("1");
    act(() => void vi.advanceTimersByTime(1));
    expect(step()).toBe("2");
  });
});
