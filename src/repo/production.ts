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
    decide: notConfigured,
    setFindingStatus: notConfigured,
    updateDrift: notConfigured,
  },
  investigations: {
    read: notConfigured,
    create: notConfigured,
    setStatus: notConfigured,
    addAction: notConfigured,
    updateAction: notConfigured,
  },
  audit: { read: notConfigured, log: notConfigured },
};
