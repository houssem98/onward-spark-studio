import { act, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { buildReport } from "@/lib/report";
import { comment, decide, submit, type Review } from "@/lib/review";
import { demoRepo } from "@/repo/demo";
import { open, setUp } from "./a11y";

setUp();

const ID = "RPT-FY25-PERF";
const AT = "2026-01-14 10:00";
const ok = <T,>(r: T | string): T => {
  if (typeof r === "string") throw new Error(r);
  return r;
};
const open1: Review = ok(
  submit([], [1, 2], { report: ID, version: 1, reviewer: "R. Reviewer" }, "M. Maker", AT),
);

describe("review rules (L5 T5)", () => {
  it("submits a saved version to a named reviewer, and refuses what separation of duties forbids", () => {
    expect(open1).toMatchObject({
      report: ID,
      version: 1,
      submittedBy: "M. Maker",
      reviewer: "R. Reviewer",
      comments: [],
    });
    expect(open1.decision).toBeUndefined();
    const s = (version: number, reviewer: string, reviews: Review[] = []) =>
      submit(reviews, [1, 2], { report: ID, version, reviewer }, "M. Maker", AT);
    expect(s(3, "R. Reviewer")).toBe("Version 3 of RPT-FY25-PERF is not saved.");
    expect(s(1, "M. Maker")).toBe("The submitter cannot review their own report.");
    expect(s(1, " ")).toBe("Name a reviewer.");
    expect(s(1, "R. Reviewer", [open1])).toBe("Version 1 is already submitted.");
    expect(s(2, "R. Reviewer", [open1])).toBe("Version 1 is still under review.");
  });

  it("takes comments from the submitter and the reviewer only, while the review is open", () => {
    const c1 = ok(comment(open1, "R. Reviewer", "Peer volumes need a source.", AT));
    const c2 = ok(comment(c1, "M. Maker", "Added in the next version.", AT));
    expect(c2.comments.map((c) => [c.by, c.text])).toEqual([
      ["R. Reviewer", "Peer volumes need a source."],
      ["M. Maker", "Added in the next version."],
    ]);
    expect(comment(open1, "O. Other", "Looks fine.", AT)).toBe(
      "Only the submitter and the reviewer may comment.",
    );
    expect(comment(open1, "R. Reviewer", "  ", AT)).toBe("A comment needs text.");
    const done = ok(decide(open1, "R. Reviewer", "Approved", "", AT));
    expect(comment(done, "R. Reviewer", "Late note", AT)).toBe("Version 1 is already approved.");
  });

  it("lets only the assigned reviewer decide, once, and a rejection needs a comment", () => {
    expect(decide(open1, "M. Maker", "Approved", "", AT)).toBe(
      "The submitter cannot approve or reject their own report, whatever their role.",
    );
    expect(decide(open1, "O. Other", "Approved", "", AT)).toBe(
      "Only the assigned reviewer, R. Reviewer, may decide.",
    );
    expect(decide(open1, "R. Reviewer", "Rejected", " ", AT)).toBe("A rejection needs a comment.");
    const rejected = ok(decide(open1, "R. Reviewer", "Rejected", "Source the peer volumes.", AT));
    expect(rejected.decision).toEqual({
      decision: "Rejected",
      by: "R. Reviewer",
      at: AT,
      comment: "Source the peer volumes.",
    });
    expect(decide(rejected, "R. Reviewer", "Approved", "", AT)).toBe(
      "Version 1 is already rejected.",
    );
    const approved = ok(decide(open1, "R. Reviewer", "Approved", "", AT));
    expect(decide(approved, "R. Reviewer", "Approved", "", AT)).toBe(
      "Version 1 is already approved.",
    );
  });

  it("reworks a rejected version as a new version, submitted again", () => {
    const rejected = ok(decide(open1, "R. Reviewer", "Rejected", "Source the peer volumes.", AT));
    const v2 = ok(
      submit(
        [rejected],
        [1, 2],
        { report: ID, version: 2, reviewer: "R. Reviewer" },
        "M. Maker",
        AT,
      ),
    );
    expect(v2).toMatchObject({ version: 2, submittedBy: "M. Maker" });
    expect(ok(decide(v2, "R. Reviewer", "Approved", "", AT)).decision?.decision).toBe("Approved");
  });
});

describe("review on the report page (L5 T5)", () => {
  it("approves the submitted version as its reviewer, which signs it off", async () => {
    await open(`/reports/${ID}?v=1`);
    const panel = screen.getByRole("heading", { name: "Review" }).closest("section")!;
    expect(panel).toHaveTextContent("Submitted by A. Haddad for review by Sarah Mitchell");
    fireEvent.change(within(panel).getByRole("textbox", { name: "Review comment" }), {
      target: { value: "Bridge reconciles; limits stated." },
    });
    await act(async () => {
      fireEvent.click(within(panel).getByRole("button", { name: "Approve" }));
    });
    expect(await within(panel).findByText(/^Approved by Sarah Mitchell/)).toBeInTheDocument();
    const signoff = screen.getByRole("heading", { name: "14. Reviewer sign-off and audit trail" });
    expect(signoff.closest("section")).toHaveTextContent("Signed off by Sarah Mitchell on");
  }, 30_000);
});

describe("review in the demo adapter (L5 T5)", () => {
  it("serves the owner's submission for the session user to review, and audits each step", async () => {
    // A fresh demo, so the page test's approval of version 1 does not decide this one.
    vi.resetModules();
    const { demoRepo: fresh } = await import("@/repo/demo");
    const { reviews, versions, reviewers } = await fresh.reports.read();
    const seeded = reviews.find((r) => r.report === ID && r.version === 1)!;
    expect(seeded).toMatchObject({ submittedBy: "A. Haddad", reviewer: "Sarah Mitchell" });
    expect(versions.some((v) => v.report === ID && v.version === 1)).toBe(true);
    expect(reviewers).toContain("A. Haddad");

    await fresh.reports.comment(ID, 1, "Checked the bridge.");
    await fresh.reports.decide(ID, 1, "Approved", "Bridge reconciles; limits stated.");
    const after = (await fresh.reports.read()).reviews.find((r) => r.version === 1)!;
    expect(after.decision).toMatchObject({ decision: "Approved", by: "Sarah Mitchell" });
    expect((await fresh.audit.read()).slice(0, 2).map((e) => e.action)).toEqual([
      "Review approved",
      "Review comment",
    ]);
    await expect(fresh.reports.decide(ID, 1, "Rejected", "Changed my mind")).rejects.toThrow(
      "Version 1 is already approved.",
    );

    // The approval is the version's sign-off.
    const v1 = (await fresh.reports.read()).versions.find((v) => v.version === 1)!;
    const doc = buildReport({ ...v1.snapshot, notice: "n", signoff: after.decision! });
    expect(doc.sections[13]!.lines[0]).toMatch(/^Signed off by Sarah Mitchell on /);
  });

  it("refuses the session user's decision on their own submission", async () => {
    const { investigations, reports, actions } = await demoRepo.investigations.read();
    const report = reports.find((r) => r.id === ID)!;
    const v = await demoRepo.reports.save(ID, {
      report,
      inv: investigations.find((i) => i.id === report.investigation)!,
      finance: await demoRepo.finance.read(),
      issues: [],
      actions,
      audit: [],
    });
    await demoRepo.reports.submit(ID, v.version, "A. Haddad");
    await expect(demoRepo.reports.decide(ID, v.version, "Approved", "")).rejects.toThrow(
      "The submitter cannot approve or reject their own report, whatever their role.",
    );
  });

  it("gives every action an owner, a due date and a status", async () => {
    const base = {
      action: "Confirm peer balance definitions",
      finding: "F-014-1",
      owner: "A. Haddad",
      due: "2026-02-28",
      priority: "Medium" as const,
      status: "Open" as const,
      outcome: "Definitions confirmed",
    };
    await expect(demoRepo.investigations.addAction({ ...base, owner: " " })).rejects.toThrow(
      "An action needs an owner.",
    );
    await expect(demoRepo.investigations.addAction({ ...base, due: "soon" })).rejects.toThrow(
      "An action needs a due date.",
    );
    await expect(
      demoRepo.investigations.addAction({ ...base, status: "Parked" as never }),
    ).rejects.toThrow("An action's status is Open, In Progress or Done.");
    await demoRepo.investigations.addAction(base);
    const id = (await demoRepo.investigations.read()).actions.find(
      (a) => a.action === base.action,
    )!.id;
    await expect(demoRepo.investigations.updateAction(id, { due: "" })).rejects.toThrow(
      "An action needs a due date.",
    );
    await demoRepo.investigations.updateAction(id, { status: "In Progress" });
  });
});
