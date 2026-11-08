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

// The database sets each event's org, actor and time from the session.
const log = async (module: string, entity: string, action: string, detail: string) => {
  ok(await db().from("audit_events").insert({ module, entity, action, detail }));
};

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
      ok(await db().from("approvals").insert({ model, decision, comment }));
      await log("Models", model, decision, comment);
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
      return {
        investigations: ok(investigations),
        actions: ok(actions),
        reports: ok(reports),
        nextSteps: [],
      };
    },
    create: async (inv) => {
      ok(await db().from("investigations").insert(inv));
      await log("Investigations", inv.id, "Created", inv.question);
    },
    setStatus: async (id, status) => {
      changed(await db().from("investigations").update({ status }).eq("id", id).select("id"));
      await log("Investigations", id, "Status changed", status);
    },
    addAction: async (a) => {
      const actions = db().from("actions");
      const { action, ...rest } = a;
      ok(await actions.insert({ ...rest, title: action }));
      await log("Investigations", rest.finding, "Action created", action);
    },
    updateAction: async (id, p) => {
      const actions = db().from("actions");
      const { action, ...rest } = p;
      const patch = action === undefined ? rest : { ...rest, title: action };
      changed(await actions.update(patch).eq("id", id).select("id"));
      await log("Investigations", id, "Action updated", Object.keys(patch).join(", "));
    },
  },
  audit: {
    read: async () =>
      ok(
        await db()
          .from("audit_events")
          .select("id, at, actor, module, entity, action, detail")
          .order("at", { ascending: false }),
      ),
    log,
  },
};
