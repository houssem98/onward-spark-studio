import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { beforeAll, describe, expect, it } from "vitest";

// Runs against the bankintelli-test project as Bravo's users: the investigator submits, the
// validator and the admin both may approve, so a refusal is the separation of duties, not a role.
const env = loadEnv("test", process.cwd(), "");
const run = Date.now().toString(36);
const users = ["INVESTIGATOR", "VALIDATOR", "ADMIN"] as const;
const db = {} as Record<(typeof users)[number], SupabaseClient>;

beforeAll(async () => {
  for (const who of users) {
    db[who] = createClient(
      env["VITE_SUPABASE_URL"] ?? "",
      env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
      { auth: { persistSession: false } },
    );
    const { error } = await db[who].auth.signInWithPassword({
      email: env[`TEST_${who}_EMAIL`] ?? "",
      password: env[`TEST_${who}_PASSWORD`] ?? "",
    });
    if (error) throw error;
  }
});

const submit = async (who: (typeof users)[number], kind: string, subject: string) =>
  expect((await db[who].from("submissions").insert({ kind, subject })).error).toBeNull();

/** The error a decision meets, or null when it is recorded. */
const decide = async (
  who: (typeof users)[number],
  kind: string,
  subject: string,
  decision: "Approved" | "Rejected",
) =>
  (
    await db[who]
      .from("approvals")
      .insert({ kind, subject, decision, comment: `${decision} in run ${run}` })
  ).error;

describe.each([
  { kind: "model", name: "a model" },
  { kind: "report", name: "a report" },
  { kind: "action", name: "an action" },
])("$name", ({ kind }) => {
  it("is never approved by its submitter, an admin included, but is by another approver", async () => {
    const byValidator = `${kind}-v-${run}`;
    const byAdmin = `${kind}-a-${run}`;
    await submit("VALIDATOR", kind, byValidator);
    await submit("ADMIN", kind, byAdmin);
    expect(await decide("VALIDATOR", kind, byValidator, "Approved")).not.toBeNull();
    expect(await decide("ADMIN", kind, byAdmin, "Approved")).not.toBeNull();
    expect(await decide("ADMIN", kind, byValidator, "Approved")).toBeNull();
    expect(await decide("VALIDATOR", kind, byAdmin, "Approved")).toBeNull();
  });

  it("is not approved twice", async () => {
    const subject = `${kind}-twice-${run}`;
    await submit("INVESTIGATOR", kind, subject);
    expect(await decide("VALIDATOR", kind, subject, "Approved")).toBeNull();
    expect(await decide("VALIDATOR", kind, subject, "Approved")).not.toBeNull();
    expect(await decide("ADMIN", kind, subject, "Approved")).not.toBeNull();
  });

  it("is not approved after a rejection", async () => {
    const subject = `${kind}-rejected-${run}`;
    await submit("INVESTIGATOR", kind, subject);
    expect(await decide("VALIDATOR", kind, subject, "Rejected")).toBeNull();
    expect(await decide("ADMIN", kind, subject, "Approved")).not.toBeNull();
  });
});
