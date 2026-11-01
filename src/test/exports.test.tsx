import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadFile, toCSV } from "@/lib/calc";
import { open, setUp } from "./a11y";

setUp();

const NOTICE =
  "Demo environment · synthetic data: every figure belongs to the fictional Northstar Bank.";

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

const root = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(join(root, dir)).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
  });

const select = (label: string) =>
  [...document.querySelectorAll("label")]
    .find((l) => l.firstElementChild?.textContent === label)!
    .querySelector("select")!;

describe("exports", () => {
  it("quotes and neutralizes header cells like values", () => {
    expect(toCSV([{ "=1+1": 1, "a,b": 2, plain: 3 }]).split("\n")[0]).toBe(`'=1+1,"a,b",plain`);
  });

  it("does not offer the credit report when the selection matches no slice", async () => {
    await open("/credit");
    const report = screen.getByRole("button", { name: /Generate report/ });
    expect(report).toBeEnabled();
    // Corporate loans only ever use the Relationship channel, so this pair matches nothing.
    await act(async () => {
      fireEvent.change(select("Segment"), { target: { value: "Corporate" } });
    });
    await act(async () => {
      fireEvent.change(select("Channel"), { target: { value: "Digital" } });
    });
    expect(report).toBeDisabled();
    await act(async () => {
      fireEvent.click(report);
    });
    expect(files).toEqual([]);
  });

  it("keeps CSV cells a spreadsheet would run as formulas as text", () => {
    const csv = toCSV(
      ["=SUM(A1:A9)", "+1+1", "-1+1", "@cmd", "\tx", "\rx", -30, "net"].map((v) => ({ v })),
    );
    expect(csv.split("\n")).toEqual([
      "v",
      "'=SUM(A1:A9)",
      "'+1+1",
      "'-1+1",
      "'@cmd",
      "'\tx",
      `"'\rx"`,
      "-30",
      "net",
    ]);
  });

  it("puts the environment and synthetic line first in CSV and Markdown files", async () => {
    downloadFile("t.csv", "a,b\n1,2");
    downloadFile("t.md", "# Title", "text/markdown");
    const [csv, md] = await Promise.all(files.map((f) => f.text));
    expect(csv!.split("\n").slice(0, 2)).toEqual([NOTICE, "a,b"]);
    expect(md!.split("\n").slice(0, 3)).toEqual([`> ${NOTICE}`, "", "# Title"]);
  });

  it("builds every download through downloadFile", () => {
    const bypass = walk("src")
      .filter((f) => /\.tsx?$/.test(f) && f !== "src/lib/calc.ts")
      .filter((f) => !/\.test\.tsx?$/.test(f) && !f.startsWith("src/components/ui/"))
      .filter((f) => /createObjectURL|new Blob\(/.test(readFileSync(join(root, f), "utf8")));
    expect(bypass).toEqual([]);
  });

  it("exports alert amounts with their currency", async () => {
    await open("/crime");
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "CSV" })[0]!);
    });
    expect(files[0]!.name).toBe("crime-alerts.csv");
    expect(await files[0]!.text).toMatch(/(^|,)\d+ (EUR|USD)(,|$)/m);
  });

  it("says which version a model card describes and that version's status", async () => {
    await open("/models/MDL-001");
    await act(async () => {
      fireEvent.change(screen.getByRole("combobox", { name: "Version" }), {
        target: { value: "3.3.0-rc1" },
      });
    });
    await screen.findByDisplayValue(/3\.3\.0-rc1/);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Model card" }));
    });
    const card = await files.at(-1)!.text;
    expect(card).toContain("Version described: 3.3.0-rc1 (Candidate)");
  });
});
