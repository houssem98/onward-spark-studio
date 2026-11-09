import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { beforeAll, describe, expect, it } from "vitest";

import { summarizeStates, withPolicyStates } from "@/lib/evidence-policy";

// L4 T6f: no investigation, finding or report stored on the bankintelli-test project keeps a
// VERIFIED the policy does not give on the row's own facts, read as each org's synthetic user; the
// policy judges at today's date, as the production adapter does. T6f recomputed every stored state
// once; other suites insert rows with column defaults on every run and the adapter recomputes on
// read, so only VERIFIED, which the database refuses to anyone else, is held here.
const env = loadEnv("test", process.cwd(), "");
const today = new Date().toISOString().slice(0, 10);
const orgs = (["ANALYST", "INVESTIGATOR"] as const).map((who) => ({
  who,
  db: createClient(env["VITE_SUPABASE_URL"] ?? "", env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "", {
    auth: { persistSession: false },
  }),
}));

beforeAll(async () => {
  for (const { who, db } of orgs) {
    const { error } = await db.auth.signInWithPassword({
      email: env[`TEST_${who}_EMAIL`] ?? "",
      password: env[`TEST_${who}_PASSWORD`] ?? "",
    });
    if (error) throw error;
  }
});

describe("stored evidence states on the test project (L4 T6f)", () => {
  it.each(orgs)(
    "stores no VERIFIED the policy does not give in $who's org",
    async ({ db }) => {
      const invs = await db
        .from("investigations")
        .select(
          "id, title, question, module, department, owner, created, period, priority, status, state, report, outstanding, findings, contradictions, limitations",
        );
      const reports = await db.from("reports").select("id, state, investigation");
      if (invs.error) throw invs.error;
      if (reports.error) throw reports.error;
      expect(invs.data.length).toBeGreaterThan(0);
      const stored = invs.data.map((i) => ({
        ...i,
        findings: Array.isArray(i.findings) ? i.findings : [],
        contradictions: Array.isArray(i.contradictions) ? i.contradictions : [],
      }));
      const policy = stored.map((i) => withPolicyStates(i, today));
      const unearned = (stored: string, earned: string) =>
        stored === "VERIFIED" && earned !== "VERIFIED";
      const wrong = [
        ...stored.flatMap((i, n) => [
          ...(unearned(i.state, policy[n]!.state) ? [`${i.id}: ${policy[n]!.state}`] : []),
          ...i.findings.flatMap((f: { id: string; state: string }, k: number) =>
            unearned(f.state, policy[n]!.findings[k]!.state)
              ? [`${i.id} ${f.id}: ${policy[n]!.findings[k]!.state}`]
              : [],
          ),
        ]),
        ...reports.data.flatMap((r) => {
          const s = summarizeStates(
            policy.filter((i) => i.id === r.investigation).map((i) => i.state),
            0,
          );
          return unearned(r.state, s) ? [`report ${r.id}: ${s}`] : [];
        }),
      ];
      expect(wrong).toEqual([]);
    },
    30_000,
  );
});
