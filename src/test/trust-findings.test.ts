import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");

const SEVERITIES = ["critical", "high", "medium", "low"];

interface Finding {
  id: string;
  severity: string;
  body: string;
}

function findings(): Finding[] {
  const text = read("docs/audit/TRUST_FINDINGS.md");
  return text
    .split(/^### /m)
    .slice(1)
    .map((block) => {
      const [head = "", ...rest] = block.split("\n");
      const [id = "", severity = ""] = head.split(" · ");
      return { id, severity, body: rest.join("\n") };
    });
}

function ledgerTasks(): Set<string> {
  const tasks = new Set<string>();
  for (const f of readdirSync(join(root, "docs/loops"))) {
    const loop = f.match(/^(L\d+)_/)?.[1];
    if (!loop) continue;
    for (const m of read(`docs/loops/${f}`).matchAll(/^- \[[ x]\] (T\d+)\b/gm)) {
      tasks.add(`${loop} ${m[1]}`);
    }
  }
  return tasks;
}

describe("trust findings", () => {
  it("lists findings with unique ids and a known severity", () => {
    const list = findings();
    expect(list.length).toBeGreaterThan(0);
    expect(list.filter((f) => !/^F\d+$/.test(f.id)).map((f) => f.id)).toEqual([]);
    expect(new Set(list.map((f) => f.id)).size).toBe(list.length);
    expect(list.filter((f) => !SEVERITIES.includes(f.severity)).map((f) => f.id)).toEqual([]);
  });

  it("cites code evidence on every finding", () => {
    const bad = findings().filter(
      (f) => !/^- Evidence: .*`[^`]+\.(tsx?|md|json|html)#[^`]+`/m.test(f.body),
    );
    expect(bad.map((f) => f.id)).toEqual([]);
  });

  it("names a fixing task that exists in a ledger", () => {
    const tasks = ledgerTasks();
    const bad = findings().filter((f) => {
      const fix = f.body.match(/^- Fix: (.+)$/m)?.[1];
      const named = [...(fix ?? "").matchAll(/\b(L\d+ T\d+)\b/g)].map((m) => m[1]!);
      return named.length === 0 || named.some((t) => !tasks.has(t));
    });
    expect(bad.map((f) => f.id)).toEqual([]);
  });

  it("states whether each finding is open or fixed", () => {
    const bad = findings().filter((f) => !/^- Status: (open|fixed)\b/m.test(f.body));
    expect(bad.map((f) => f.id)).toEqual([]);
  });
});
