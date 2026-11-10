import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SUGGESTIONS, answer } from "@/lib/copilot";
import { actionProblem, submit } from "@/lib/review";
import { buildReport } from "@/lib/report";
import { demoRepo } from "@/repo/demo";
import { clickTab, open, setUp } from "./a11y";

setUp();

const click = (name: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });

const createViaWizard = async () => {
  await open("/performance");
  await clickTab("Root-cause engine");
  for (let i = 0; i < 9; i++) await click("Next");
  await click("Create investigation");
  expect(await screen.findByText(/created\./)).toBeInTheDocument();
  const { investigations, actions } = await demoRepo.investigations.read();
  const created = investigations.find((i) => i.id.startsWith("INV-2026-"))!;
  return { investigations, actions, created };
};

// L5 T7 council items. Each test failed against the code the council attacked.
describe("L5 T7 council: wizard investigation (C1, C3)", () => {
  it("C1: a wizard investigation gets finding ids of its own and none of the flagship's actions", async () => {
    const { investigations, actions, created } = await createViaWizard();
    const ids = investigations.flatMap((i) => i.findings.map((f) => f.id));
    expect(new Set(ids).size).toBe(ids.length);
    const mine = new Set(created.findings.map((f) => f.id));
    expect(actions.filter((a) => mine.has(a.finding))).toEqual([]);
  }, 30_000);

  it("C3: a wizard investigation does not link to the flagship's report", async () => {
    const { created } = await createViaWizard();
    expect(created.report).toBeUndefined();
  }, 30_000);
});

describe("L5 T7 council: wizard honesty (C13)", () => {
  it("C13: the wizard says it copies the peer sample findings whatever the question", async () => {
    await open("/performance");
    await clickTab("Root-cause engine");
    expect(screen.queryByText(/still copies the credit-vs-peer sample findings/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Investigation question"), {
      target: { value: "Why did credit revenue underperform our target?" },
    });
    expect(
      await screen.findByText(/still copies the credit-vs-peer sample findings/),
    ).toBeInTheDocument();
  }, 30_000);
});

// A fresh copy of the demo repository, so a test starts from the data as the demo opens.
const fresh = async () => {
  vi.resetModules();
  return (await import("@/repo/demo")).demoRepo;
};
const PERF = "RPT-FY25-PERF";
const INV = "INV-2025-014";
const newAction = {
  action: "X",
  finding: "F-014-1",
  owner: "G. Rossi",
  due: "2026-02-28",
  priority: "Medium" as const,
  status: "Open" as const,
  outcome: "o",
};

describe("L5 T7 council: saved versions and approval (C2, C4, C6, C15)", () => {
  it("C2: version 1 keeps the data as the demo opened it, whatever the reviewer changes later", async () => {
    const repo = await fresh();
    const before = (await repo.investigations.read()).investigations.find((i) => i.id === INV)!;
    await repo.investigations.setStatus(INV, "In Progress");
    await repo.investigations.addAction(newAction);
    const v1 = (await repo.reports.read()).versions.find((v) => v.version === 1)!;
    expect(v1.snapshot.inv.status).toBe(before.status);
    expect(v1.snapshot.audit.some((e) => e.action === "Status changed")).toBe(false);
    expect(v1.snapshot.actions.some((a) => a.action === "X")).toBe(false);
  });

  it("C4: an approval sets the report's status and its header; Approved is set no other way", async () => {
    const repo = await fresh();
    await repo.reports.decide(PERF, 1, "Approved", "");
    const { reports } = await repo.investigations.read();
    expect(reports.find((r) => r.id === PERF)!.status).toBe("Approved");
    const v1 = (await repo.reports.read()).versions[0]!;
    const doc = buildReport({
      ...v1.snapshot,
      notice: "n",
      signoff: { by: "Sarah Mitchell", at: "2026-11-09 22:00" },
    });
    expect(doc.header[0]).toContain("Approved");
    expect(doc.header[0]).not.toContain("Pending Review");
    await expect(repo.investigations.setStatus(INV, "Approved")).rejects.toThrow(/approval/);
  });

  it("C6: reports.save refuses another report's snapshot, drops a sign-off, and refuses unearned Verified", async () => {
    const repo = await fresh();
    const honest = (await repo.reports.read()).versions[0]!.snapshot;
    await expect(repo.reports.save("RPT-OTHER", honest)).rejects.toThrow();
    const saved = await repo.reports.save(PERF, {
      ...honest,
      signoff: { by: "Nobody", at: "2026-01-01 00:00" },
    });
    expect(saved.snapshot.signoff).toBeUndefined();
    const forged = {
      ...honest,
      inv: {
        ...honest.inv,
        outstanding: 0,
        contradictions: [],
        findings: honest.inv.findings.map((f) => ({ ...f, state: "VERIFIED" as const })),
      },
    };
    await expect(repo.reports.save(PERF, forged)).rejects.toThrow(
      /Only the evidence policy sets Verified/,
    );
  });

  it("C15: what reports.read returns cannot be changed by the caller", async () => {
    const repo = await fresh();
    const { versions, reviews } = await repo.reports.read();
    expect(() => (versions as unknown[]).push({})).toThrow();
    expect(() => {
      (reviews[0] as { decision?: unknown }).decision = { decision: "Approved" };
    }).toThrow();
  });
});

describe("L5 T7 council: report page and review (C4, C7, C8, C9, C11, C12)", () => {
  it("C4: a version with no sign-off does not read Approved in its header", async () => {
    const repo = await fresh();
    await repo.reports.decide(PERF, 1, "Approved", "");
    const v1 = (await repo.reports.read()).versions[0]!;
    const report = (await repo.investigations.read()).reports.find((r) => r.id === PERF)!;
    const doc = buildReport({ ...v1.snapshot, report, notice: "n" });
    expect(doc.header[0]).not.toContain("Approved");
  });

  it("C7: the person who saved a version cannot be named its reviewer", () => {
    const refused = submit(
      [],
      [{ version: 1, savedBy: "A. Haddad" }],
      { report: PERF, version: 1, reviewer: "A. Haddad" },
      "G. Rossi",
      "t",
    );
    expect(refused).toBe("The person who saved a version cannot review it.");
  });

  it("C8: the review panel does not carry a refusal from one version to another", async () => {
    const snapshot = (await demoRepo.reports.read()).versions[0]!.snapshot;
    await demoRepo.reports.save(PERF, snapshot);
    const router = await open(`/reports/${PERF}?v=1`);
    await click("Reject");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Refused: A rejection needs a comment.",
    );
    await act(async () => {
      await router.navigate({ to: "/reports/$id", params: { id: PERF }, search: { v: 2 } });
    });
    expect(await screen.findByText(/^Version 2, saved/)).toBeInTheDocument();
    expect(screen.queryByText(/^Refused:/)).toBeNull();
  }, 30_000);

  it("C9: section 14 lists the report's actions and downloads, and Print is audited", async () => {
    const repo = await fresh();
    await repo.investigations.addAction(newAction);
    await repo.audit.export(`${PERF}-v1.html`, "HTML report downloaded");
    const v1 = (await repo.reports.read()).versions[0]!;
    const { actions } = await repo.investigations.read();
    const doc = buildReport({
      ...v1.snapshot,
      actions,
      audit: await repo.audit.read(),
      notice: "n",
    });
    const trail = doc.sections.find((s) => /audit trail/.test(s.title))!.lines.join("\n");
    expect(trail).toContain("Action created");
    expect(trail).toContain("Exported");

    await open(`/reports/${PERF}`);
    vi.spyOn(window, "print").mockImplementation(() => {});
    const log = vi.spyOn(demoRepo.audit, "log");
    await click("Print");
    expect(log).toHaveBeenCalledWith("Reports", PERF, "Printed", expect.any(String));
  }, 30_000);

  // C11 was not reproduced: the router keeps the raw ?v= beside the validated one, so a malformed
  // version already says it does not exist. This pins that.
  it.each(["abc", "0", "01"])("C11 (guard): ?v=%s says the version does not exist", async (v) => {
    await open(`/reports/${PERF}?v=${v}`);
    expect(
      await screen.findByText(new RegExp(`Version ${v} of ${PERF} does not exist`)),
    ).toBeInTheDocument();
  });

  it("C12: the calculation section states its unit", async () => {
    const repo = await fresh();
    const v1 = (await repo.reports.read()).versions[0]!;
    const doc = buildReport({ ...v1.snapshot, notice: "n" });
    const calc = doc.sections.find((s) => /Reproducible calculations/.test(s.title))!;
    expect(calc.lines.join(" ")).toMatch(/in USD millions/);
  });
});

describe("L5 T7 council: copilot and production (C5, C10, C16)", () => {
  const readAll = async () => ({
    finance: await demoRepo.finance.read(),
    models: await demoRepo.models.read(),
    datasets: await demoRepo.datasets.read(),
    crime: await demoRepo.crime.read(),
  });

  it("C5: the copilot does not verify an answer whose only source is a simulated system", async () => {
    const data = await readAll();
    for (const q of [SUGGESTIONS[4]!, SUGGESTIONS[5]!])
      expect(answer(q, data).state, q).not.toBe("VERIFIED");
  });

  it("C10: the flagship answer's caveats follow the data", async () => {
    const data = await readAll();
    const resolved = {
      ...data,
      datasets: {
        ...data.datasets,
        issues: data.datasets.issues.map((i) =>
          i.id === "DQ-101" ? { ...i, status: "Resolved" as const } : i,
        ),
      },
    };
    const missing = answer(SUGGESTIONS[0]!, resolved).missing.join(" | ");
    expect(missing).not.toMatch(/DQ-101/);
    expect(missing).not.toMatch(/low comparability/);
    expect(missing).toMatch(/medium comparability/);
  });

  it("C16: production refuses an action with no owner or no due date before it writes", async () => {
    vi.resetModules();
    const insert = vi.fn(async () => ({ data: null, error: null }));
    vi.doMock("@/repo/supabase", () => ({ supabase: () => ({ from: () => ({ insert }) }) }));
    const { productionRepo } = await import("@/repo/production");
    await expect(
      productionRepo.investigations.addAction({ ...newAction, owner: "" }),
    ).rejects.toThrow("An action needs an owner.");
    await expect(
      productionRepo.investigations.addAction({ ...newAction, due: "soon" }),
    ).rejects.toThrow("An action needs a due date.");
    await expect(
      productionRepo.investigations.updateAction("ACT-101", { owner: " " }),
    ).rejects.toThrow("An action needs an owner.");
    expect(insert).not.toHaveBeenCalled();
    vi.doUnmock("@/repo/supabase");
  });
});

// The chairman's list, K1 to K32, run on 2026-11-10; these failed against the tree before this round.
const text = (d: ReturnType<typeof buildReport>) =>
  [...d.header, ...d.sections.flatMap((s) => s.lines)].join("\n");
const SIGNOFF = { by: "Sarah Mitchell", at: "2026-11-09 22:00" };

describe("L5 T7 chairman: the Verified label and report states (K9, K10, K26)", () => {
  it("K9: the report list's state needs a sign-off, as the report page's does", async () => {
    vi.resetModules();
    vi.doMock("@/lib/evidence-policy", async (orig) => {
      const real = await orig<typeof import("@/lib/evidence-policy")>();
      return {
        ...real,
        withPolicyStates: <T extends { findings: { state: string }[] }>(i: T) => ({
          ...i,
          state: "VERIFIED",
          findings: i.findings.map((f) => ({ ...f, state: "VERIFIED" })),
        }),
      };
    });
    const repo = (await import("@/repo/demo")).demoRepo;
    const state = async () =>
      (await repo.investigations.read()).reports.find((r) => r.id === PERF)!.state;
    expect(await state()).not.toBe("VERIFIED");
    await repo.reports.decide(PERF, 1, "Approved", "");
    expect(await state()).toBe("VERIFIED");
    vi.doUnmock("@/lib/evidence-policy");
  });

  it("K10: an open data-quality issue on a cited dataset keeps the label off", async () => {
    const repo = await fresh();
    const s = (await repo.reports.read()).versions[0]!.snapshot;
    const inv = {
      ...s.inv,
      outstanding: 0,
      contradictions: [],
      findings: s.inv.findings.map((f) => ({ ...f, state: "VERIFIED" as const })),
    };
    const open = buildReport({ ...s, inv, signoff: SIGNOFF, notice: "n" });
    expect(open.verified).toBe(false);
    expect(text(open)).toMatch(/Not labeled Verified: \d+ open items remain\./);
    expect(buildReport({ ...s, inv, issues: [], signoff: SIGNOFF, notice: "n" }).verified).toBe(
      true,
    );
  });

  it("K26: a report with no findings says why it is not Verified", async () => {
    const repo = await fresh();
    const s = (await repo.reports.read()).versions[0]!.snapshot;
    const inv = { ...s.inv, outstanding: 0, contradictions: [], findings: [] };
    const doc = buildReport({ ...s, inv, issues: [], signoff: SIGNOFF, notice: "n" });
    expect(text(doc)).not.toMatch(/undefined/);
    expect(text(doc)).toMatch(/Not labeled Verified: it has no findings\./);
  });
});

describe("L5 T7 chairman: copilot and scope (K11, K13, K24)", () => {
  const readAll = async () => ({
    finance: await demoRepo.finance.read(),
    models: await demoRepo.models.read(),
    datasets: await demoRepo.datasets.read(),
    crime: await demoRepo.crime.read(),
  });

  it("K11: a figure named as the open-issues metric counts what that metric counts", async () => {
    const data = await readAll();
    const all = data.datasets.issues.filter((i) => i.status !== "Resolved").length;
    const a = answer("Which data-quality issues affect credit reporting?", data);
    for (const x of a.assessments)
      if (x.claim.metricId === "open_dq_issues") expect(x.claimed).toBe(all);
  });

  it("K13: the peer answer says peer revenue growth is not available", async () => {
    const missing = answer(SUGGESTIONS[0]!, await readAll()).missing.join(" | ");
    expect(missing).toMatch(/Peer credit revenue growth not available/);
  });

  it.each([
    "Why did our credit revenue's compound growth lag our peers this year?",
    "Why did our credit revenue lag our European peers this year?",
  ])("K24: %s is not refused as another currency", async (q) => {
    expect(answer(q, await readAll()).intent).toBe("Credit performance vs peer group");
  });
});

describe("L5 T7 chairman: pages and actions (K15, K18, K28)", () => {
  it("K15: after a save, the live report's audit trail shows it", async () => {
    const router = await open(`/reports/${PERF}`);
    const saves = () => screen.queryAllByText(/ · Version saved$/).length;
    const before = saves();
    await click("Save version");
    expect(await screen.findByText(/^Version \d+, saved/)).toBeInTheDocument();
    await act(async () => {
      await router.navigate({ to: "/reports/$id", params: { id: PERF }, search: {} });
    });
    await screen.findByRole("button", { name: "Save version" });
    expect(saves()).toBe(before + 1);
  }, 30_000);

  it("K18: the overview does not say no sign-off exists", async () => {
    await open("/");
    expect(screen.queryByText(/No verification workflow or reviewer/)).toBeNull();
    expect(
      await screen.findByText(/Verified only after a reviewer approves a saved version/),
    ).toBeInTheDocument();
  }, 30_000);

  it("K28: an impossible due date is refused", () => {
    for (const due of ["2026-13-45", "2026-02-30"])
      expect(actionProblem({ due }), due).toBe("An action needs a due date.");
    expect(actionProblem({ due: "2026-02-28" })).toBeNull();
  });
});
