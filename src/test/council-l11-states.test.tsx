import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CaseWaterfall } from "@/components/explain";
import { caseBridge } from "@/lib/explain";
import { demoRepo } from "@/repo/demo";

import { open, setUp } from "./a11y";

setUp();
afterEach(() => vi.restoreAllMocks());

// L11 T9: the council's findings on states, keyboard and reduced motion (C5, C8, C12, C16, C17,
// C20), each reproduced; C9 needs a browser's focus handling and is in e2e/explain.spec.ts.
const PATH = "/models/MDL-001?tab=explainability";
const ORDER = [
  "Inputs and data quality",
  "Prediction",
  "Global importance",
  "Contributions by case",
  "Case explanation",
  "Review",
];
const states = () =>
  [...document.querySelectorAll<HTMLElement>("[data-stage]")].map((s) => s.dataset["state"]);
const stage = (title: string) => document.querySelector<HTMLElement>(`[data-stage="${title}"]`)!;
const frame = () => document.querySelector<HTMLElement>("[data-case-waterfall]")!;
const button = (name: string) =>
  document.querySelector<HTMLButtonElement>(`[aria-label="${name}"]`)!;
const read = async (id = "MDL-001") => (await demoRepo.models.read()).explanations[id]!;

describe("council fixes: states, keyboard and reduced motion (L11 T9)", () => {
  // Three page opens, one of them waiting out a read that never answers.
  it(
    "C5: stages load and fail with the explanation read, and the page and the credit page stand",
    {
      timeout: 20_000,
    },
    async () => {
      vi.spyOn(demoRepo.models, "explain").mockReturnValue(new Promise(() => {}));
      await open(PATH);
      expect(states()).toEqual(ORDER.map(() => "loading"));
      expect(stage("Prediction").querySelector('[role="status"][aria-busy="true"]')).not.toBeNull();
      expect(document.querySelector("h1")).not.toBeNull();
      cleanup();
      vi.restoreAllMocks();

      vi.spyOn(demoRepo.models, "explain").mockRejectedValue(new Error("explanations down"));
      await open(PATH);
      expect(states()).toEqual(ORDER.map(() => "error"));
      expect(stage("Prediction").querySelector('[role="alert"]')).not.toBeNull();
      expect(document.querySelector("h1")).not.toBeNull();
      cleanup();
      await open("/credit");
      expect(document.querySelector("h1")).toHaveTextContent("Credit Intelligence");
      expect(document.querySelector('a[href*="tab=explainability"]')).toBeNull();
    },
  );

  it("C8: a change of model starts the tab afresh", async () => {
    const router = await open(PATH);
    const select = () => frame().querySelector<HTMLSelectElement>('select[aria-label="Case"]')!;
    const first = await read();
    act(() => fireEvent.change(select(), { target: { value: first.observations[1]!.id } }));
    act(() => fireEvent.click(button("Step forward")));
    await act(async () => {
      await router.navigate({
        to: "/models/$id",
        params: { id: "MDL-002" },
        search: { tab: "explainability" },
      });
    });
    const second = await read("MDL-002");
    expect(select().value).toBe(second.observations[0]!.id);
    expect(frame().dataset["step"]).toBe("0");
  });

  it("C12: review claims no review it has not seen", async () => {
    await open(PATH);
    expect(stage("Review").dataset["state"]).toBe("pending");
    expect(stage("Review")).toHaveTextContent("Not reviewed");
    cleanup();
    await open("/models/MDL-002?tab=explainability");
    expect(stage("Review").dataset["state"]).toBe("success");
    expect(stage("Review")).toHaveTextContent("Approved");
  });

  it("C16: each chart's heading sits a level under its stage's, and the stage heading is its title", async () => {
    await open(PATH);
    for (const [i, title] of ORDER.entries()) {
      const s = stage(title);
      const h2s = [...s.querySelectorAll("h2")];
      expect(h2s).toHaveLength(1);
      expect(h2s[0]!.textContent).toBe(`${i + 1}${title}`);
    }
    for (const title of ["Global importance", "Contributions by case", "Case explanation"])
      expect(stage(title).querySelector("figure h3")).not.toBeNull();
  });

  it("C17: turning reduced motion on during play stops the timer and shows the final state", async () => {
    let reduce = false;
    const listeners = new Set<() => void>();
    const mm = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation(
      (q) =>
        ({
          ...mm(q),
          get matches() {
            return reduce && q === "(prefers-reduced-motion: reduce)";
          },
          addEventListener: (_: string, l: () => void) => void listeners.add(l),
          removeEventListener: (_: string, l: () => void) => void listeners.delete(l),
        }) as unknown as MediaQueryList,
    );
    const e = await read();
    const last = caseBridge(e, e.observations[0]!).steps.length;
    vi.useFakeTimers();
    try {
      render(<CaseWaterfall explanation={e} />);
      act(() => fireEvent.click(button("Play")));
      // One step plays, so the case is mid-play when the setting changes.
      act(() => void vi.advanceTimersToNextTimer());
      expect(frame().dataset["step"]).toBe("1");
      act(() => {
        reduce = true;
        listeners.forEach((l) => l());
      });
      expect(frame().dataset["step"]).toBe(String(last));
      expect(button("Play")).not.toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("C20: the beeswarm's scroller is reachable by keyboard and named", async () => {
    await open(PATH);
    const scroller = document.querySelector("svg[data-beeswarm]")!.parentElement!;
    expect(scroller.getAttribute("tabindex")).toBe("0");
    expect(scroller.getAttribute("aria-label")).toBeTruthy();
  });
});
