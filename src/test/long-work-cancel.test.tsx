import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

// Its own file: a second copilot sheet opened in the same test file hangs the worker.
describe("long-running steps: cancel (L5 T6)", () => {
  it("lets the copilot's answer be cancelled, keeping the question", async () => {
    await open("/crime");
    const q =
      "Why did our credit division revenue grow more slowly than our competitors this year?";
    const finance = await demoRepo.finance.read();
    const slow = later<typeof finance>();
    vi.spyOn(demoRepo.finance, "read").mockReturnValueOnce(slow.promise);
    const input = screen.getByRole("textbox", { name: "Ask BankIntelli" });
    fireEvent.change(input, { target: { value: q } });
    fireEvent.submit(input.closest("form")!);
    expect(await screen.findByRole("status", { name: "Answering" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("status", { name: "Answering" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Question for the copilot" })).toHaveValue(q);
    // The read arrives after the cancel: its answer is not shown.
    await act(async () => slow.resolve(finance));
    expect(screen.queryByText("Credit performance vs peer group")).toBeNull();
  }, 30_000);
});
