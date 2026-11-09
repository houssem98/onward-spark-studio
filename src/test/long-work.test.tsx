import { act, fireEvent, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useStep } from "@/hooks/use-step";
import { demoRepo } from "@/repo/demo";
import { open, setUp } from "./a11y";

setUp();
afterEach(() => vi.restoreAllMocks());

/** A promise the test settles by hand. */
function later<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("long-running steps (L5 T6)", () => {
  it("shows a step running, and a cancelled step's late result changes nothing", async () => {
    const work = later<string>();
    const done = vi.fn();
    const { result } = renderHook(() =>
      useStep((x: string) => work.promise.then((r) => r + x), done),
    );
    act(() => void result.current.run("!"));
    expect(result.current.status).toBe("running");
    act(() => result.current.cancel());
    expect(result.current.status).toBe("idle");
    await act(async () => work.resolve("late"));
    expect(done).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("keeps a failed step's input and error, and a retry runs it again with the same input", async () => {
    const fn = vi
      .fn<(x: string) => Promise<string>>()
      .mockRejectedValueOnce(new Error("Network unreachable"))
      .mockResolvedValueOnce("answer");
    const done = vi.fn();
    const { result } = renderHook(() => useStep(fn, done));
    await act(async () => result.current.run("question"));
    expect(result.current).toMatchObject({ status: "error", error: "Network unreachable" });
    expect(result.current.args).toEqual(["question"]);
    await act(async () => result.current.retry());
    expect(fn).toHaveBeenLastCalledWith("question");
    expect(done).toHaveBeenCalledWith("answer");
    expect(result.current.status).toBe("idle");
  });

  it("keeps the question when the copilot cannot answer, and answers on retry", async () => {
    await open("/crime");
    const q =
      "Why did our credit division revenue grow more slowly than our competitors this year?";
    vi.spyOn(demoRepo.finance, "read").mockRejectedValueOnce(new Error("Finance source timed out"));
    const input = screen.getByRole("textbox", { name: "Ask BankIntelli" });
    fireEvent.change(input, { target: { value: q } });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not answer: Finance source timed out",
    );
    expect(screen.getByRole("textbox", { name: "Question for the copilot" })).toHaveValue(q);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });
    expect(await screen.findByText("Credit performance vs peer group")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  }, 30_000);
});
