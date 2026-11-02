import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnimatedNumber, Reveal, Stagger } from "@/components/motion";

const fmt = (n: number) => `$${n.toFixed(1)}M`;

function reduceMotion(on: boolean) {
  const mm = window.matchMedia;
  vi.spyOn(window, "matchMedia").mockImplementation((q) => ({
    ...mm(q),
    matches: on && q === "(prefers-reduced-motion: reduce)",
  }));
}

let observed: { cb: IntersectionObserverCallback; el?: Element }[] = [];
function stubObserver() {
  observed = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      rec: { cb: IntersectionObserverCallback; el?: Element };
      constructor(cb: IntersectionObserverCallback) {
        this.rec = { cb };
        observed.push(this.rec);
      }
      observe(el: Element) {
        this.rec.el = el;
      }
      disconnect() {}
    },
  );
}
function belowFold() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 5000,
  } as DOMRect);
}
function scrollIntoView() {
  act(() =>
    observed.forEach((o) =>
      o.cb([{ isIntersecting: true, target: o.el } as IntersectionObserverEntry], {} as never),
    ),
  );
}

// Frames are stepped by hand: each call to step() advances the clock and runs one frame.
let frames: FrameRequestCallback[] = [];
let now = 0;
function stubFrames() {
  frames = [];
  now = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  document.documentElement.style.setProperty("--duration-base", "220ms");
}
function step(ms: number) {
  now += ms;
  const run = frames;
  frames = [];
  act(() => run.forEach((f) => f(now)));
}

const visible = (el: HTMLElement) => el.querySelector("[aria-hidden]")!.textContent;
const accessible = (el: HTMLElement) => {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[aria-hidden]").forEach((n) => n.remove());
  return clone.textContent;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty("--duration-base");
});

describe("motion primitives", () => {
  it("reduced motion shows the final state at once", () => {
    reduceMotion(true);
    stubObserver();
    stubFrames();
    belowFold();
    const { container, rerender } = render(
      <>
        <Reveal>section</Reveal>
        <AnimatedNumber value={100} format={fmt} />
      </>,
    );
    expect(container.querySelector("[data-reveal]")).toHaveAttribute("data-reveal", "idle");
    rerender(
      <>
        <Reveal>section</Reveal>
        <AnimatedNumber value={200} format={fmt} />
      </>,
    );
    expect(frames).toHaveLength(0);
    expect(visible(container)).toBe("$200.0M");
  });

  it("reveals below-the-fold content once it scrolls into view, and leaves it visible without an observer", () => {
    reduceMotion(false);
    stubObserver();
    belowFold();
    const { container } = render(<Reveal>section</Reveal>);
    const el = container.querySelector("[data-reveal]")!;
    expect(el).toHaveAttribute("data-reveal", "hidden");
    scrollIntoView();
    expect(el).toHaveAttribute("data-reveal", "shown");

    vi.unstubAllGlobals();
    const bare = render(<Reveal>section</Reveal>).container.querySelector("[data-reveal]");
    expect(bare).toHaveAttribute("data-reveal", "idle");
  });

  it("staggers direct children without wrapping them, at most six steps", () => {
    const { container } = render(
      <Stagger className="grid">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <p key={i}>{i}</p>
        ))}
      </Stagger>,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-stagger");
    expect(root).toHaveClass("grid");
    expect([...root.children].map((c) => c.tagName)).toEqual(Array(7).fill("P"));
    const css = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    expect(css).toContain("[data-stagger] > :nth-child(n + 6) { --reveal-step: 5; }");
    expect(css).toContain("transition-delay: calc(var(--stagger) * var(--reveal-step, 0));");
  });

  it("never tweens on first render", () => {
    reduceMotion(false);
    stubFrames();
    const { container } = render(<AnimatedNumber value={100} format={fmt} />);
    expect(frames).toHaveLength(0);
    expect(visible(container)).toBe("$100.0M");
    expect(accessible(container)).toBe("$100.0M");
  });

  it("tweens straight to a changed value while its accessible text is the final value at every frame", () => {
    reduceMotion(false);
    stubFrames();
    const { container, rerender } = render(<AnimatedNumber value={100} format={fmt} />);
    rerender(<AnimatedNumber value={200} format={fmt} />);
    const seen: number[] = [];
    for (let i = 0; i < 20 && frames.length; i++) {
      step(16);
      seen.push(Number(visible(container)!.replace(/[$M]/g, "")));
      expect(accessible(container)).toBe("$200.0M");
    }
    expect(seen.length).toBeGreaterThan(5);
    expect(seen.at(-1)).toBe(200);
    expect(now).toBeLessThanOrEqual(240);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]!);
      expect(seen[i]).toBeLessThanOrEqual(200);
    }
  });

  it("renders the same markup on the server and on the first client render", () => {
    const tree = (
      <main>
        <Reveal className="a">section</Reveal>
        <Stagger>
          <p>1</p>
          <p>2</p>
        </Stagger>
        <AnimatedNumber value={42} format={fmt} />
      </main>
    );
    const html = renderToString(tree);
    // The server cannot know the visitor prefers reduced motion; the client does.
    reduceMotion(true);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const errors: unknown[] = [];
    act(() => {
      hydrateRoot(container, tree, { onRecoverableError: (e) => errors.push(e) });
    });
    expect(errors).toEqual([]);
    expect(container.innerHTML).toBe(html);
    container.remove();
  });
});
