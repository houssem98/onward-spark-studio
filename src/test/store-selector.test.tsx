import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { storeQuery, useActions, useStore } from "@/store/app-store";

function AuditCount({ entity }: { entity: string }) {
  const events = useStore((s) => s.audit.filter((a) => a.entity === entity));
  const actions = useActions();
  return (
    <>
      <p>events: {events.length}</p>
      <button onClick={() => actions.addCaseNote(entity, "probe note", "Investigator")}>
        add note
      </button>
    </>
  );
}

async function renderCount(entity: string) {
  const queryClient = new QueryClient();
  await queryClient.ensureQueryData(storeQuery);
  render(
    <QueryClientProvider client={queryClient}>
      <AuditCount entity={entity} />
    </QueryClientProvider>,
  );
}

describe("useStore", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders a selector that builds a new array without looping", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await renderCount("CASE-0917");
    expect(screen.getByText("events: 1")).toBeInTheDocument();
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/getSnapshot|Maximum update depth/);
  });

  it("re-renders when the store changes", async () => {
    await renderCount("CASE-0917");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "add note" }));
    });
    expect(await screen.findByText("events: 2")).toBeInTheDocument();
  });
});
