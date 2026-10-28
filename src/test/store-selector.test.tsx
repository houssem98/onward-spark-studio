import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { actions, useStore } from "@/store/app-store";

function AuditCount({ entity }: { entity: string }) {
  const events = useStore((s) => s.audit.filter((a) => a.entity === entity));
  return <p>events: {events.length}</p>;
}

describe("useStore", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders a selector that builds a new array without looping", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AuditCount entity="CASE-0917" />);
    expect(screen.getByText("events: 1")).toBeInTheDocument();
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/getSnapshot|Maximum update depth/);
  });

  it("re-renders when the store changes", () => {
    render(<AuditCount entity="CASE-0917" />);
    act(() => actions.addCaseNote("CASE-0917", "probe note", "Investigator"));
    expect(screen.getByText("events: 2")).toBeInTheDocument();
  });
});
