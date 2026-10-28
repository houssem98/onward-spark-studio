import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
const walk = (dir: string): string[] =>
  readdirSync(join(root, dir)).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
  });

const STATUSES = ["implemented", "partial", "mocked", "broken", "absent", "not verified"];

interface Row {
  kind: string;
  id: string;
  status: string;
  evidence: string;
  known: string;
}

function rows(): Row[] {
  return read("docs/audit/CAPABILITY_MATRIX.md")
    .split("\n")
    .filter((l) => /^\| (route|control|export) \|/.test(l))
    .map((l) => {
      const [kind = "", id = "", status = "", evidence = "", known = ""] = l
        .split(" | ")
        .map((c) => c.replace(/^\| /, "").replace(/ \|$/, "").trim());
      return { kind, id: id.replace(/`/g, ""), status, evidence, known };
    });
}

describe("capability matrix", () => {
  it("has a row for every file in src/routes", () => {
    const ids = new Set(
      rows()
        .filter((r) => r.kind === "route")
        .map((r) => r.id),
    );
    const missing = walk("src/routes")
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => !ids.has(f));
    expect(missing).toEqual([]);
  });

  it("has a control row for every store action a route calls", () => {
    const called = new Set(
      walk("src/routes")
        .filter((f) => f.endsWith(".tsx"))
        .flatMap((f) => [...read(f).matchAll(/\bactions\.(\w+)\(/g)].map((m) => m[1]!))
        .filter((name) => name !== "filter" && name !== "map"),
    );
    const covered = new Set(
      rows()
        .filter((r) => r.kind === "control")
        .flatMap((r) => [...r.id.matchAll(/actions\.(\w+)/g)].map((m) => m[1]!)),
    );
    expect([...called].filter((name) => !covered.has(name)).sort()).toEqual([]);
  });

  it("has an export row for every file that calls downloadFile", () => {
    const exporters = walk("src")
      .filter((f) => /\.tsx?$/.test(f) && f !== "src/lib/calc.ts")
      .filter((f) => /\bdownloadFile\(/.test(read(f)));
    const ids = new Set(
      rows()
        .filter((r) => r.kind === "export")
        .map((r) => r.id.split(" ")[0]),
    );
    expect(exporters.filter((f) => !ids.has(f))).toEqual([]);
  });

  it("names every table export in an export row", () => {
    const named = walk("src")
      .filter((f) => /\.tsx$/.test(f))
      .flatMap((f) => [...read(f).matchAll(/exportName="([^"]+)"/g)].map((m) => m[1]!));
    const text = read("docs/audit/CAPABILITY_MATRIX.md")
      .split("\n")
      .filter((l) => l.startsWith("| export |"))
      .join("\n");
    expect(named.filter((n) => !text.includes(`\`exportName="${n}"\``)).sort()).toEqual([]);
  });

  it("uses only the roadmap's status words and cites evidence on every row", () => {
    const bad = rows().filter(
      (r) => !STATUSES.includes(r.status) || !/`[^`]+\.(tsx?|md)#[^`]+`/.test(r.evidence),
    );
    expect(bad.map((r) => r.id)).toEqual([]);
  });

  it("backs every implemented row with a test that exists", () => {
    const testText = walk("src")
      .filter((f) => /\.test\.tsx?$/.test(f))
      .map(read)
      .join("\n");
    const unbacked = rows()
      .filter((r) => r.status === "implemented")
      .filter((r) => {
        const name = r.known.match(/^test: (.+)$/)?.[1];
        return !name || !testText.includes(name);
      });
    expect(unbacked.map((r) => r.id)).toEqual([]);
  });
});
