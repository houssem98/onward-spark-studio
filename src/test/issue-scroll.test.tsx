import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { open, setUp } from "./a11y";

setUp();

describe("the data-quality register", () => {
  // An inline ref scrolled the row on every render, so typing a resolution kept pulling the
  // register back to the row (L10 T8, C10).
  it("scrolls the selected issue into view when it is selected, not on every render", async () => {
    await open("/data?tab=quality&issue=DQ-106");
    const row = document.querySelector('tr[aria-selected="true"]');
    expect(row, "the selected issue row").not.toBeNull();
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    const onRow = () => scroll.mock.contexts.filter((c) => c === row).length;
    const once = onRow();
    expect(once, "scrolled into view on selection").toBeGreaterThanOrEqual(1);
    const field = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      '[role="dialog"] textarea, [role="dialog"] input[type="text"]',
    );
    expect(field, "the resolution field").not.toBeNull();
    for (const value of ["a", "ab", "abc"])
      await act(async () => {
        fireEvent.change(field!, { target: { value } });
      });
    expect(onRow()).toBe(once);
  });
});
