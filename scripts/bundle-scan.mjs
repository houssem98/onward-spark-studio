#!/usr/bin/env node
// bundle-scan — fails when fixture data reaches a production build.
//
//   node scripts/bundle-scan.mjs production   # builds with VITE_DATA_SOURCE=production; no marker may be in .output
//   node scripts/bundle-scan.mjs demo         # scans the current build; every marker must be in .output
//
// A marker is text that only one fixture module holds. The demo run proves the scan can see
// fixture text in built files, so the production run cannot pass by looking at nothing.
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MARKERS = {
  "src/data/credit.ts": "Working capital line",
  "src/data/crime.ts": "Repeated sub-threshold cash deposits",
  "src/data/datasets.ts": "Posted journal entries and account balances by legal entity.",
  "src/data/explanations.ts": "Seeded SHAP fixture for the credit classifiers",
  "src/data/finance.ts": "Solent",
  "src/data/investigations.ts":
    "Is the SME credit risk model still fit for purpose after input drift?",
  "src/data/models.ts": "Retail PD Scorecard",
  "src/repo/demo.ts": "Precision decline in CNP channel",
};

const mode = process.argv[2];
if (mode !== "production" && mode !== "demo") {
  console.log("usage: node scripts/bundle-scan.mjs production|demo");
  process.exit(2);
}

const errs = Object.entries(MARKERS)
  .filter(([file, marker]) => !readFileSync(file, "utf8").includes(marker))
  .map(([file, marker]) => `"${marker}" is no longer in ${file}: pick a new marker`);

if (mode === "production")
  execSync("npx vite build", {
    stdio: "inherit",
    env: { ...process.env, VITE_DATA_SOURCE: "production" },
  });

const files = readdirSync(".output", { recursive: true })
  .map((f) => join(".output", f))
  .filter((f) => statSync(f).isFile());
const texts = files.map((f) => readFileSync(f, "utf8"));
const hits = Object.entries(MARKERS).map(([file, marker]) => [
  file,
  files.filter((_, i) => texts[i].includes(marker)),
]);
for (const [file, found] of hits) {
  if (mode === "production" && found.length)
    errs.push(`${file} reached the production build: ${found.join(", ")}`);
  if (mode === "demo" && !found.length)
    errs.push(`${file} is missing from the demo build, so the scan cannot see fixture text`);
}

// The model adapter and its key stay on the server: the server build must hold the adapter, so the
// scan is seen to find it, and nothing the browser loads may name the provider or carry a key.
const PROVIDER = "api.deepseek.com";
const KEY = /sk-[A-Za-z0-9]{16,}|DEEPSEEK_API_KEY|SUPABASE_SERVICE_ROLE_KEY/;
const inClient = (f) => f.startsWith(join(".output", "public"));
if (!files.some((f, i) => !inClient(f) && texts[i].includes(PROVIDER)))
  errs.push(`the model adapter (${PROVIDER}) is missing from the server build`);
for (const [i, f] of files.entries())
  if (inClient(f) && (texts[i].includes(PROVIDER) || KEY.test(texts[i])))
    errs.push(`the model provider or a key reached the client build: ${f}`);

console.log(
  `bundle-scan: ${mode} · ${files.length} files · ${hits.map(([f, found]) => `${f} ${found.length}`).join(", ")}`,
);
if (errs.length === 0) {
  console.log("bundle-scan: clean");
  process.exit(0);
}
for (const e of errs) console.log(`   ✗ ${e}`);
console.log(`\nbundle-scan: ${errs.length} problem(s).`);
process.exit(1);
