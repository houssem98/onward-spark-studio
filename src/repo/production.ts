import { refuseUnearnedVerified, reportState, withPolicyStates } from "@/lib/evidence-policy";
import { validAction } from "@/lib/review";

const today = () => new Date().toISOString().slice(0, 10);
import { supabase } from "./supabase";
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
};

const db = () => supabase();

function ok<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
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
    // The role is read from the server's profile row, never from the session's user metadata.
    read: async () => {
      const {
        data: { user },
      } = await supabase().auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data } = await supabase()
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) throw new Error("No role assigned");
      return { user: { name: data.name as string, role: ROLE[data.role as string] ?? "" } };
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
        db()
          .from("investigations")
          .select(
            "id, title, question, module, department, owner, created, period, priority, status, state, report, outstanding, findings, contradictions, limitations",
          ),
        db()
          .from("actions")
          .select("id, action:title, finding, owner, due, priority, status, outcome, evidence"),
        db()
          .from("reports")
          .select("id, title, owner, period, investigation, state, status, updated"),
      ]);
      // Stored states are not trusted: the policy sets every one from the record's facts.
      const invs = ok(investigations).map((i) => withPolicyStates(i, today()));
      return {
        investigations: invs,
        actions: ok(actions),
        reports: ok(reports).map((r) => ({
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
      ok(await table.insert(withPolicyStates(inv, today())));
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
  // No table holds report versions yet; storing them is a schema change the human approves.
  reports: {
    read: notConfigured,
    save: notConfigured,
    submit: notConfigured,
    comment: notConfigured,
    decide: notConfigured,
  },
  audit: {
    read: async () =>
      ok(
        await db()
          .from("audit_events")
          .select("id, at, actor, module, entity, action, detail")
          .order("at", { ascending: false }),
      ),
    log: async (module, entity, action, detail) => {
      ok(await db().from("audit_events").insert({ module, entity, action, detail }));
    },
    export: async (file, detail) =>
      ok(await db().rpc("record_export", { p_entity: file, p_detail: detail })) === true,
  },
};
