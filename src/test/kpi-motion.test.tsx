import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Kpi } from "@/components/kit";
import { TooltipProvider } from "@/components/ui/tooltip";
import { open, setUp } from "./a11y";

setUp();

let frames: FrameRequestCallback[] = [];
let now = 0;
function stubFrames() {
  frames = [];
  now = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
}
function settle() {
  for (let i = 0; i < 100 && frames.length; i++) {
    now += 16;
    const run = frames;
    frames = [];
    act(() => run.forEach((f) => f(now)));
  }
}

function reduceMotion(on: boolean) {
  const mm = window.matchMedia;
  vi.spyOn(window, "matchMedia").mockImplementation((q) => ({
    ...mm(q),
    matches: on && q === "(prefers-reduced-motion: reduce)",
  }));
}

/** The root route owns <html>, so the token reaches the computed style instead of inline. */
function baseToken() {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
    const style = real(el, pseudo);
    if (el !== document.documentElement) return style;
    return new Proxy(style, {
      get: (t, k) => {
        if (k === "getPropertyValue")
          return (n: string) => (n === "--duration-base" ? ".22s" : t.getPropertyValue(n));
        const v: unknown = Reflect.get(t, k);
        return typeof v === "function" ? v.bind(t) : v;
      },
    });
  });
}

const tile = (value: string) => (
  <TooltipProvider>
    <Kpi def="operating_income" value={value} />
  </TooltipProvider>
);
const figure = (root: ParentNode = document) => root.querySelector("[data-kpi-value]")!;
const tweening = (root: ParentNode = document) =>
  root.querySelectorAll("[data-kpi-value] [aria-hidden]").length;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("KPI figures", () => {
  it("never tween on first render", () => {
    reduceMotion(false);
    baseToken();
    stubFrames();
    const { container } = render(tile("$743M"));
    expect(frames).toHaveLength(0);
    expect(tweening(container)).toBe(0);
    expect(figure(container).textContent).toBe("$743M");
  });

  it("tween in their own format on a change and land on the exact text", () => {
    reduceMotion(false);
    baseToken();
    stubFrames();
    const { container, rerender } = render(tile("$743M"));
    rerender(tile("$812M"));
    expect(tweening(container)).toBe(1);
    expect(container.querySelector("[data-kpi-value] .sr-only")!.textContent).toBe("$812M");
    const seen: string[] = [];
    for (let i = 0; i < 30 && frames.length; i++) {
      now += 16;
      const run = frames;
      frames = [];
      act(() => run.forEach((f) => f(now)));
      seen.push(
        (container.querySelector("[data-kpi-value] [aria-hidden]") ?? figure(container))
          .textContent!,
      );
    }
    expect(seen.length).toBeGreaterThan(5);
    expect(
      seen.every((s) => /^\$\d{3}M$/.test(s)),
      seen.join(" "),
    ).toBe(true);
    expect(tweening(container)).toBe(0);
    expect(figure(container).textContent).toBe("$812M");
  });

  it("tween through the sign change with the sign each frame's value has", () => {
    reduceMotion(false);
    baseToken();
    stubFrames();
    const { container, rerender } = render(tile("$743M"));
    rerender(tile("−$12M"));
    const seen: string[] = [];
    for (let i = 0; i < 30 && frames.length; i++) {
      now += 16;
      const run = frames;
      frames = [];
      act(() => run.forEach((f) => f(now)));
      seen.push(
        (container.querySelector("[data-kpi-value] [aria-hidden]") ?? figure(container))
          .textContent!,
      );
    }
    const signed = seen.map((s) => (s.startsWith("−") ? -1 : 1) * Number(s.replace(/[^\d.]/g, "")));
    expect(
      seen.every((s) => /^−?\$\d+M$/.test(s)),
      seen.join(" "),
    ).toBe(true);
    expect(
      signed.every((v, i) => i === 0 || v <= signed[i - 1]!),
      seen.join(" "),
    ).toBe(true);
    expect(signed[0]).toBeGreaterThan(0);
    expect(seen.at(-1)).toBe("−$12M");
  });

  it("keep text that is not a figure as it is", () => {
    reduceMotion(false);
    stubFrames();
    const { container, rerender } = render(tile("$743M"));
    rerender(tile("Unavailable"));
    expect(frames).toHaveLength(0);
    expect(figure(container).textContent).toBe("Unavailable");
  });

  it("land on the repository's values after a credit filter changes them", async () => {
    const read = () =>
      [...document.querySelectorAll("main [data-kpi-value]")].map((e) => e.textContent);
    const filter = async () => {
      const segment = document.querySelector<HTMLSelectElement>("main select")!;
      await act(async () => {
        fireEvent.change(segment, { target: { value: segment.options[1]!.value } });
      });
    };

    reduceMotion(true);
    await open("/credit");
    const before = read();
    await filter();
    const expected = read();
    expect(expected).not.toEqual(before);
    cleanup();
    vi.restoreAllMocks();

    reduceMotion(false);
    baseToken();
    stubFrames();
    await open("/credit");
    expect(tweening()).toBe(0);
    await filter();
    expect(tweening()).toBeGreaterThan(0);
    settle();
    expect(tweening()).toBe(0);
    expect(read()).toEqual(expected);
  }, 60_000);
});
