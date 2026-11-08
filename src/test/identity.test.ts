import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { afterEach, describe, expect, it } from "vitest";

import { productionRepo } from "@/repo/production";
import { signIn, signOut, supabase } from "@/repo/supabase";

// Runs against the bankintelli-test project: `.env` holds its URL and publishable key,
// `.env.test.local` its synthetic analyst. Both files are gitignored.
const env = loadEnv("test", process.cwd(), "");
const analyst = {
  email: env["TEST_ANALYST_EMAIL"] ?? "",
  password: env["TEST_ANALYST_PASSWORD"] ?? "",
};

describe("identity", () => {
  afterEach(() => signOut());

  it("refuses a read without a session", async () => {
    await expect(productionRepo.session.read()).rejects.toThrow("Not signed in");
    const { data } = await supabase().from("profiles").select("name, role");
    expect(data).toEqual([]);
  });

  it("takes the role from the server and ignores one the client sends", async () => {
    await signIn(analyst.email, analyst.password);
    await supabase().auth.updateUser({ data: { role: "admin" } });
    const { data: updated } = await supabase()
      .from("profiles")
      .update({ role: "admin" })
      .neq("role", "admin")
      .select();
    expect(updated ?? []).toEqual([]);
    expect((await productionRepo.session.read()).user).toEqual({
      name: "Test Analyst",
      role: "Credit analyst",
    });
  });

  it("refuses a session after sign-out, its old token included", async () => {
    await signIn(analyst.email, analyst.password);
    const token = (await supabase().auth.getSession()).data.session?.access_token;
    expect((await productionRepo.session.read()).user.role).toBe("Credit analyst");
    await signOut();
    await expect(productionRepo.session.read()).rejects.toThrow("Not signed in");
    const stale = createClient(
      env["VITE_SUPABASE_URL"] ?? "",
      env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      },
    );
    const { data } = await stale.from("profiles").select("name, role");
    expect(data).toEqual([]);
  });
});
