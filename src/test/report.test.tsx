import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildReport,
  reportHtml,
  reportMarkdown,
  SYNTHETIC_LINE,
  verifiedLabel,
} from "@/lib/report";
import { demoRepo } from "@/repo/demo";
import { open, setUp } from "./a11y";

setUp();

const NOTICE =
  "Demo environment · synthetic data: every figure belongs to the fictional Northstar Bank.";
const TITLES = [
  "1. Executive summary",
  "2. Scope and methodology",
  "3. KPI scorecard",
  "4. Peer group and comparability",
  "5. Revenue and profitability trends",
  "6. Variance decomposition",
  "7. Root-cause findings",
  "8. Evidence and source register",
  "9. Reproducible calculations",
  "10. Data quality and verification results",
  "11. Limitations and unresolved questions",
  "12. Recommendations and impact assumptions",
  "13. Action plan",
  "14. Reviewer sign-off and audit trail",
];

async function doc(id: string) {
  const { investigations, reports, actions } = await demoRepo.investigations.read();
  const report = reports.find((r) => r.id === id)!;
  return buildReport({
    report,
    inv: investigations.find((i) => i.id === report.investigation)!,
    finance: await demoRepo.finance.read(),
    issues: (await demoRepo.datasets.read()).issues,
    actions,
    audit: await demoRepo.audit.read(),
    notice: NOTICE,
  });
}
const section = (d: Awaited<ReturnType<typeof doc>>, n: number) =>
  d.sections[n - 1]!.lines.join("\n");

describe("report (L5 T3)", () => {
  it("labels a report Verified only when every finding is VERIFIED and a reviewer signed off", () => {
    const by = { by: "R. Reviewer", at: "2026-01-14" };
    expect(verifiedLabel(["VERIFIED", "VERIFIED"], by)).toBe(true);
    // One unverified finding withholds it.
    expect(verifiedLabel(["VERIFIED", "PARTIALLY_VERIFIED"], by)).toBe(false);
    expect(verifiedLabel(["VERIFIED", "HYPOTHESIS"], by)).toBe(false);
    // No sign-off withholds it.
    expect(verifiedLabel(["VERIFIED", "VERIFIED"], undefined)).toBe(false);
    expect(verifiedLabel([], by)).toBe(false);
  });

  it("withholds the label from a fully verified report until a reviewer signs off", async () => {
    const { investigations, reports, actions } = await demoRepo.investigations.read();
    const report = reports.find((r) => r.id === "RPT-FY25-PERF")!;
    const inv = investigations.find((i) => i.id === report.investigation)!;
    const verified = {
      ...inv,
      state: "VERIFIED" as const,
      outstanding: 0,
      contradictions: [],
      findings: inv.findings.map((f) => ({ ...f, state: "VERIFIED" as const })),
    };
    const input = {
      report,
      inv: verified,
      finance: await demoRepo.finance.read(),
      issues: [],
      actions,
      audit: [],
      notice: NOTICE,
    };
    const unsigned = buildReport(input);
    expect([unsigned.verified, unsigned.state]).toEqual([false, "PARTIALLY_VERIFIED"]);
    expect(unsigned.sections[0]!.lines).toContain(
      "Not labeled Verified: no reviewer has signed off.",
    );
    const signed = buildReport({ ...input, signoff: { by: "R. Reviewer", at: "2026-01-14" } });
    expect([signed.verified, signed.state]).toEqual([true, "VERIFIED"]);
    expect(signed.sections[13]!.lines[0]).toBe("Signed off by R. Reviewer on 2026-01-14.");
  });

  it("builds the flagship report's fourteen sections from the repository, the label withheld with its reasons", async () => {
    const d = await doc("RPT-FY25-PERF");
    expect(d.sections.map((s) => s.title)).toEqual(TITLES);
    expect(d.header).toEqual(
      expect.arrayContaining([NOTICE, SYNTHETIC_LINE, expect.stringContaining("RPT-FY25-PERF")]),
    );
    expect([d.verified, d.state]).toEqual([false, "PARTIALLY_VERIFIED"]);
    expect(section(d, 1)).toContain("a gap of −$30.0M");
    expect(section(d, 1)).toContain("−$2.0M is unexplained");
    expect(section(d, 1)).toContain(
      "Not labeled Verified: 5 of 5 findings are not verified, 6 open items remain, and no reviewer has signed off.",
    );
    expect(section(d, 2)).toContain(
      "Comparison cohort: Harborline Financial, Meridian Trust Bank, Cascade Federal",
    );
    expect(section(d, 4)).toContain("Solent Commercial");
    expect(section(d, 6)).toContain("Other / unexplained −$2.0M (residual)");
    expect(section(d, 7)).toContain("F-014-4 · Hypothesis · hypothesis");
    expect(section(d, 9)).toContain("Gap = 120 − 150 = −30");
    expect(section(d, 9)).toContain("mean of 152, 146, 151 = 149.7");
    expect(section(d, 10)).toContain("DQ-101");
    expect(section(d, 11)).toContain("+$9.0M year on year");
    expect(section(d, 11)).toContain("Peer funding costs are not available");
    expect(section(d, 14)).toContain("No reviewer has signed off.");
  });

  it("states what is out of scope instead of showing figures a report's question and period do not cover", async () => {
    const d = await doc("RPT-RISK-Q4");
    expect(d.sections.map((s) => s.title)).toEqual(TITLES);
    expect(section(d, 3)).toBe("No scorecard for Q4-25 in this data.");
    for (const n of [4, 5, 6, 9]) expect(section(d, n)).toMatch(/^None in scope:/);
  });

  it("escapes HTML and Markdown and carries the environment and synthetic lines in both", () => {
    const d = {
      title: "<script>alert(1)</script>",
      header: [NOTICE, SYNTHETIC_LINE],
      sections: [{ title: "1. Executive summary", lines: ["[x](javascript:alert(1)) & <b>"] }],
      verified: false,
      state: "UNVERIFIED" as const,
    };
    const html = reportHtml(d);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&amp; &lt;b&gt;");
    const md = reportMarkdown(d);
    expect(md).toContain("\\[x\\]\\(javascript:alert\\(1\\)\\)");
    expect(md).toContain("\\<b\\>");
    for (const out of [html, md]) {
      expect(out).toContain(NOTICE);
      expect(out).toContain(SYNTHETIC_LINE);
    }
  });
});

describe("report page (L5 T3)", () => {
  const textOf = (b: Blob) =>
    new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsText(b);
    });
  let files: { name: string; text: Promise<string> }[] = [];
  beforeEach(() => {
    files = [];
    let blob: Blob | undefined;
    Object.assign(URL, {
      createObjectURL: (b: Blob) => {
        blob = b;
        return "blob:export";
      },
      revokeObjectURL: () => undefined,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      files.push({ name: this.download, text: textOf(blob!) });
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders every section, withholds the label, prints and downloads both formats", async () => {
    await open("/reports/RPT-FY25-PERF");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(
      expect.arrayContaining(TITLES),
    );
    expect(screen.queryByText("Verified", { exact: true })).toBeNull();
    expect(screen.getByText(/Not labeled Verified/)).toBeInTheDocument();

    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalled();

    for (const name of ["Download HTML", "Download Markdown"])
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name }));
      });
    expect(files.map((f) => f.name)).toEqual(["RPT-FY25-PERF.html", "RPT-FY25-PERF.md"]);
    const [html, md] = await Promise.all(files.map((f) => f.text));
    expect(html).toContain("<h2>1. Executive summary</h2>");
    expect(md).toContain("## 1. Executive summary");
    for (const out of [html!, md!]) {
      expect(out).toContain(NOTICE);
      expect(out).toContain(SYNTHETIC_LINE);
      expect(out).toContain("Not labeled Verified");
    }
  }, 30_000);
});
