import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { open, setUp } from "./a11y";

setUp();

describe("copilot", () => {
  it("answers from the repository on a page whose loader did not fetch that data", async () => {
    await open("/crime");
    const input = screen.getByRole("textbox", { name: "Ask BankIntelli" });
    fireEvent.change(input, {
      target: { value: "Why did credit revenue grow more slowly than peers?" },
    });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });
    expect(await screen.findByText("Credit performance vs peer group")).toBeInTheDocument();
    expect(screen.getByText("5.3%")).toBeInTheDocument();
  });
});
