import {
  refuseUnearnedVerified,
  reportState,
  storedState,
  withPolicyStates,
} from "@/lib/evidence-policy";
import type { Investigation } from "@/data/investigations";
import type { ReportSnapshot, ReportVersion } from "@/lib/report";
import { validAction } from "@/lib/review";

const today = () => new Date().toISOString().slice(0, 10);
import { supabase, supabaseAs } from "./supabase";
import type { Repository } from "./types";

const notConfigured = async (): Promise<never> => {
  throw new Error("Production data source not configured");
};

const ROLE: Record<string, string> = {
  executive: "Executive",
  credit_analyst: "Credit analyst",
  investigator: "Investigator",
  reviewer: "Reviewer",
  model_validator: "Model validator",
  admin: "Admin",
  chief_risk_officer: "Chief Risk Officer",
};

const db = () => supabase();

const stored = (i: Investigation): Investigation => ({
  ...i,
  state: storedState(i.state),
  findings: i.findings.map((f) => ({ ...f, state: storedState(f.state) })),
});

const VERSION = "report, version, saved_at, saved_by, snapshot";
const toVersion = (v: {
  report: string;
  version: number;
  saved_at: string;
  saved_by: string;
  snapshot: unknown;
}): ReportVersion => ({
  report: v.report,
  version: v.version,
  savedAt: v.saved_at,
  savedBy: v.saved_by,
  snapshot: v.snapshot as ReportSnapshot,
});

function ok<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

// The server returns at most 1,000 rows a request, so every list is read page by page in a stable
// order; one unpaged read silently drops whatever lies past the cap.
const PAGE = 1000;
async function every<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const got = ok(await page(from, from + PAGE - 1));
    rows.push(...got);
    if (got.length < PAGE) return rows;
  }
}

/** An update that row-level security refuses matches no row and reports no error; say so. */
function changed({ data, error }: { data: unknown[] | null; error: unknown }) {
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted");
}

// Every write below is audited by the database in the same transaction; the server sets each event's
// org, actor, authority, outcome and time.
export const productionRepo: Repository = {
  environment: "production",
  session: {
    // The role is read from the server's profile row, never from the session's user metadata. On
    // the server the caller is whoever's token came with the request; no token is no session.
    read: async (request?: Request) => {
      const token = request?.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
      if (request && !token) throw new Error("Not signed in");
      const client = token ? supabaseAs(token) : supabase();
      const {
        data: { user },
      } = await client.auth.getUser(token);
      if (!user) throw new Error("Not signed in");
      const { data } = await client
        .from("profiles")
        .select("name, role, org_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) throw new Error("No role assigned");
      return {
        user: {
          name: data.name as string,
          role: ROLE[data.role as string] ?? "",
          ...(data.org_id ? { org: data.org_id as string } : {}),
        },
      };
    },
  },
  finance: { read: notConfigured },
  credit: { read: notConfigured },
  crime: {
    read: notConfigured,
    updateAlert: notConfigured,
    updateCase: notConfigured,
    addCaseNote: notConfigured,
  },
  datasets: {
    read: notConfigured,
    setCertification: notConfigured,
    updateIssue: notConfigured,
    requestAccess: notConfigured,
    decideAccess: notConfigured,
  },
  models: {
    read: notConfigured,
    explain: notConfigured,
    selectVersion: notConfigured,
    decide: async (model, decision, comment) => {
      // Refused unless someone else submitted the model and it has no decision yet.
      ok(await db().from("approvals").insert({ kind: "model", subject: model, decision, comment }));
    },
    setFindingStatus: notConfigured,
    updateDrift: notConfigured,
  },
  investigations: {
    read: async () => {
      const [investigations, actions, reports] = await Promise.all([
        every((a, b) =>
          db()
            .from("investigations")
            .select(
              "id, title, question, module, department, owner, created, period, priority, status, state, report, outstanding, findings, contradictions, limitations",
            )
            .order("id")
            .range(a, b),
        ),
        every((a, b) =>
          db()
            .from("actions")
            .select("id, action:title, finding, owner, due, priority, status, outcome, evidence")
            .order("id")
            .range(a, b),
        ),
        every((a, b) =>
          db()
            .from("reports")
            .select("id, title, owner, period, investigation, state, status, updated")
            .order("id")
            .range(a, b),
        ),
      ]);
      // Stored states are not trusted: the policy sets every one from the record's facts.
      const invs = investigations.map((i) => withPolicyStates(i, today()));
      return {
        investigations: invs,
        actions,
        reports: reports.map((r) => ({
          ...r,
          // No sign-off is read here yet, so no report in this list reads Verified.
          state: reportState(
            invs.filter((i) => i.id === r.investigation).map((i) => i.state),
            0,
            false,
          ),
        })),
        nextSteps: [],
      };
    },
    create: async (inv) => {
      const table = db().from("investigations");
      refuseUnearnedVerified(inv, today());
      ok(await table.insert(stored(withPolicyStates(inv, today()))));
    },
    setStatus: async (id, status) => {
      changed(await db().from("investigations").update({ status }).eq("id", id).select("id"));
    },
    addAction: async (a) => {
      const actions = db().from("actions");
      validAction(a);
      const { action, ...rest } = a;
      ok(await actions.insert({ ...rest, title: action }));
    },
    updateAction: async (id, p) => {
      const actions = db().from("actions");
      validAction(p);
      const { action, ...rest } = p;
      changed(
        await actions
          .update(action === undefined ? rest : { ...rest, title: action })
          .eq("id", id)
          .select("id"),
      );
    },
  },
  // Versions are stored (L6 T4a); reviews are not yet, so submit, comment and decide still refuse.
  reports: {
    create: async (r) => {
      const table = db().from("reports");
      ok(await table.insert({ ...r, state: storedState(r.state) }));
    },
    read: async () => ({
      versions: (
        await every((a, b) =>
          db().from("report_versions").select(VERSION).order("report").order("version").range(a, b),
        )
      ).map(toVersion),
      reviews: [],
      reviewers: [],
    }),
    save: async (id, snapshot) => {
      const versions = db().from("report_versions");
      if (snapshot.report.id !== id)
        throw new Error(`The snapshot is of ${snapshot.report.id}, not ${id}.`);
      refuseUnearnedVerified(snapshot.inv, today());
      // A sign-off comes only from an approval, and states only from the policy.
      const { signoff: _signoff, ...kept } = snapshot;
      const row = await versions
        .insert({ report: id, snapshot: { ...kept, inv: withPolicyStates(kept.inv, today()) } })
        .select(VERSION)
        .single();
      return toVersion(ok(row));
    },
    submit: notConfigured,
    comment: notConfigured,
    decide: notConfigured,
  },
  audit: {
    read: async () =>
      every((a, b) =>
        db()
          .from("audit_events")
          .select("id, at, actor, module, entity, action, detail")
          .order("at", { ascending: false })
          .order("id")
          .range(a, b),
      ),
    log: async (module, entity, action, detail) => {
      ok(await db().from("audit_events").insert({ module, entity, action, detail }));
    },
    export: async (file, detail) =>
      ok(await db().rpc("record_export", { p_entity: file, p_detail: detail })) === true,
  },
};
