import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModelSpend } from "@/components/ModelSpend";
import { handleSpend } from "@/lib/ask.server";
import { productionRepo } from "@/repo/production";

// L7 T6c (the council's F4 and F12): in production the server reads the caller's own session from
// the request, and a chief risk officer has a role there. Supabase is a fake; nothing leaves the test.
const fake = vi.hoisted(() => ({
  users: {
    "admin-token": { id: "u1", profile: { name: "A. Admin", role: "admin", org_id: "org-1" } },
    "cro-token": { id: "u2", profile: { name: "S. Mitchell", role: "chief_risk_officer" } },
  } as Record<string, { id: string; profile: { name: string; role: string; org_id?: string } }>,
  browserToken: "admin-token",
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (
    _url: string,
    _key: string,
    opts?: { global?: { headers?: Record<string, string> } },
  ) => {
    const token = opts?.global?.headers?.["Authorization"]?.replace(/^Bearer /, "");
    const u = token ? fake.users[token] : undefined;
    return {
      auth: {
        getUser: async () => ({ data: { user: u ? { id: u.id } : null }, error: null }),
        getSession: async () => ({
          data: { session: { access_token: fake.browserToken } },
          error: null,
        }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: u?.profile ?? null }) }) }),
      }),
    };
  },
}));

vi.mock("@/repo/queries", () => ({ repo: { environment: "production" } }));

const NOW = new Date("2026-11-09T02:00:00Z");
const store = { record: async () => {}, month: async () => 3 };
const get = (token?: string) =>
  new Request("http://x/api/ask", token ? { headers: { authorization: `Bearer ${token}` } } : {});

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "http://supabase.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "pk");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the server reads the caller's own session in production (L7 T6c)", () => {
  it("gives a signed-in admin the month's spend, and refuses a request that carries no session", async () => {
    const ok = await handleSpend(get("admin-token"), {
      repo: productionRepo,
      store,
      now: () => NOW,
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ monthUsd: 3 });
    expect(await productionRepo.session.read(get("admin-token"))).toEqual({
      user: { name: "A. Admin", role: "Admin", org: "org-1" },
    });
    const anon = await handleSpend(get(), { repo: productionRepo, store, now: () => NOW });
    expect(anon.status).toBe(401);
    const forged = await handleSpend(get("forged"), {
      repo: productionRepo,
      store,
      now: () => NOW,
    });
    expect(forged.status).toBe(401);
  });

  it("reads a chief risk officer's profile as Chief Risk Officer, who sees spend", async () => {
    const res = await handleSpend(get("cro-token"), {
      repo: productionRepo,
      store,
      now: () => NOW,
    });
    expect(res.status).toBe(200);
    expect(await productionRepo.session.read(get("cro-token"))).toEqual({
      user: { name: "S. Mitchell", role: "Chief Risk Officer" },
    });
  });

  it("sends the browser's session token when the panel asks for spend", async () => {
    const f = vi.fn<typeof fetch>(async () => Response.json({ monthUsd: 3, alert: null }));
    vi.stubGlobal("fetch", f);
    await act(async () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <ModelSpend role="Admin" />
        </QueryClientProvider>,
      );
    });
    expect(await screen.findByText("Model spend this month: $3.00")).toBeInTheDocument();
    expect(new Headers(f.mock.calls[0]![1]?.headers).get("authorization")).toBe(
      "Bearer admin-token",
    );
  });
});
