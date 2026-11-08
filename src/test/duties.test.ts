import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { beforeAll, describe, expect, it } from "vitest";

// Runs against the bankintelli-test project. Bravo's investigator makes and submits work, its
// validator and admin both may approve, so a refusal is the separation of duties, not a role.
// Alpha's analyst stands for a second org.
const env = loadEnv("test", process.cwd(), "");
const run = Date.now().toString(36);
const users = ["INVESTIGATOR", "VALIDATOR", "ADMIN", "ANALYST"] as const;
type User = (typeof users)[number];
const db = {} as Record<User, SupabaseClient>;

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

/** Work of this kind made by `maker`: a model is only a name; a report or an action is a row. */
async function make(maker: User, kind: string, tag: string) {
  if (kind === "model") return `model-${tag}-${run}`;
  if (kind === "report") {
    const id = `report-${tag}-${run}`;
    expect(
      (await db[maker].from("reports").insert({ id, title: `Duties ${tag}` })).error,
    ).toBeNull();
    return id;
  }
  const { data, error } = await db[maker]
    .from("actions")
    .insert({ title: `Duties ${tag} ${run}` })
    .select("id")
    .single();
  expect(error).toBeNull();
  return (data as { id: string }).id;
}

/** The error a submission meets, or null when it is recorded. */
const submit = async (who: User, kind: string, subject: string) =>
  (await db[who].from("submissions").insert({ kind, subject })).error;

/** The error a decision meets, or null when it is recorded. */
const decide = async (
  who: User,
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
    const byValidator = await make("INVESTIGATOR", kind, "v");
    const byAdmin = await make("ADMIN", kind, "a");
    expect(await submit("VALIDATOR", kind, byValidator)).toBeNull();
    expect(await submit("ADMIN", kind, byAdmin)).toBeNull();
    expect(await decide("VALIDATOR", kind, byValidator, "Approved")).not.toBeNull();
    expect(await decide("ADMIN", kind, byAdmin, "Approved")).not.toBeNull();
    expect(await decide("ADMIN", kind, byValidator, "Approved")).toBeNull();
    expect(await decide("VALIDATOR", kind, byAdmin, "Approved")).toBeNull();
  });

  it("is not approved twice", async () => {
    const subject = await make("INVESTIGATOR", kind, "twice");
    expect(await submit("INVESTIGATOR", kind, subject)).toBeNull();
    expect(await decide("VALIDATOR", kind, subject, "Approved")).toBeNull();
    expect(await decide("VALIDATOR", kind, subject, "Approved")).not.toBeNull();
    expect(await decide("ADMIN", kind, subject, "Approved")).not.toBeNull();
  });

  it("is not approved after a rejection", async () => {
    const subject = await make("INVESTIGATOR", kind, "rejected");
    expect(await submit("INVESTIGATOR", kind, subject)).toBeNull();
    expect(await decide("VALIDATOR", kind, subject, "Rejected")).toBeNull();
    expect(await decide("ADMIN", kind, subject, "Approved")).not.toBeNull();
  });
});

describe.each([
  { kind: "report", name: "a report" },
  { kind: "action", name: "an action" },
])("the maker of $name", ({ kind }) => {
  it("never approves it, even when a colleague submits it", async () => {
    const subject = await make("ADMIN", kind, "made");
    expect(await submit("INVESTIGATOR", kind, subject)).toBeNull();
    expect(await decide("ADMIN", kind, subject, "Approved")).not.toBeNull();
    expect(await decide("VALIDATOR", kind, subject, "Approved")).toBeNull();
  });

  it("can submit only one that exists in its org", async () => {
    expect(await submit("INVESTIGATOR", kind, `${kind}-none-${run}`)).not.toBeNull();
  });
});

it("lets two orgs submit work under the same name", async () => {
  const subject = `shared-${run}`;
  expect(await submit("ANALYST", "model", subject)).toBeNull();
  expect(await submit("INVESTIGATOR", "model", subject)).toBeNull();
});

describe("Approved", () => {
  it("is never written by a client into an investigation or a report", async () => {
    const id = `inv-by-hand-${run}`;
    const investigations = () => db.INVESTIGATOR.from("investigations");
    expect(
      (await investigations().insert({ id, title: "By hand", status: "Approved" })).error,
    ).not.toBeNull();
    expect((await investigations().insert({ id, title: "By hand" })).error).toBeNull();
    expect(
      (await investigations().update({ status: "Approved" }).eq("id", id)).error,
    ).not.toBeNull();
    expect(
      (await investigations().update({ status: "Closed" }).eq("id", id).select("status")).data,
    ).toEqual([{ status: "Closed" }]);
    expect(
      (
        await db.INVESTIGATOR.from("reports").insert({
          id: `report-by-hand-${run}`,
          title: "By hand",
          status: "Approved",
        })
      ).error,
    ).not.toBeNull();
  });

  it("comes to a report when its approval is recorded", async () => {
    const subject = await make("INVESTIGATOR", "report", "approved");
    const status = async () =>
      (await db.INVESTIGATOR.from("reports").select("status").eq("id", subject).single()).data;
    expect(await status()).toEqual({ status: "Draft" });
    expect(await submit("INVESTIGATOR", "report", subject)).toBeNull();
    expect(await decide("VALIDATOR", "report", subject, "Approved")).toBeNull();
    expect(await status()).toEqual({ status: "Approved" });
  });
});
