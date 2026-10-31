import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "src/routes");
// Waterfall renders its own ResponsiveContainer, so each use is a chart too.
const CHARTS = ["ResponsiveContainer", "Waterfall"];
const outside: string[] = [];
const empty: string[] = [];

for (const f of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
  const src = ts.createSourceFile(
    f,
    readFileSync(join(dir, f), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const at = (n: ts.Node) => `${f}:${src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1}`;
  const visit = (node: ts.Node, framed: boolean): void => {
    const tag = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : undefined;
    const name = tag?.tagName.getText(src);
    if (name && CHARTS.includes(name) && !framed)
      outside.push(`${at(node)}: ${name} outside a ChartFrame`);
    if (tag && name === "ChartFrame")
      for (const a of tag.attributes.properties)
        if (
          ts.isJsxAttribute(a) &&
          ["unit", "period", "source"].includes(a.name.getText(src)) &&
          /^\{?\s*(["'`])\s*\1\s*\}?$/.test(a.initializer?.getText(src) ?? "")
        )
          empty.push(`${at(a)}: empty ${a.name.getText(src)}`);
    ts.forEachChild(node, (c) => visit(c, framed || name === "ChartFrame"));
  };
  visit(src, false);
}

describe("chart frames", () => {
  it("puts every chart in a route inside a ChartFrame", () => {
    expect(outside).toEqual([]);
  });

  it("gives every ChartFrame a unit, a period and a source", () => {
    expect(empty).toEqual([]);
  });
});
