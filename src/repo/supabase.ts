import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

// Created on first use, so a build without the project's URL and key still loads.
// One client per module: only the browser signs in, never the server render.
const config = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Production data source not configured");
  return [url, key] as const;
};

export function supabase() {
  return (client ??= createClient(...config()));
}

/** On the server, a client that acts as the caller whose token came with the request, so
 * row-level security applies to them; it keeps no session of its own. */
export function supabaseAs(token: string) {
  return createClient(...config(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The browser's session token, for a server route that must know who is calling. */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase().auth.getSession();
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Ends this device's session on the server; the user's sessions elsewhere stay signed in.
export async function signOut() {
  const { error } = await supabase().auth.signOut({ scope: "local" });
  if (error) throw error;
}
