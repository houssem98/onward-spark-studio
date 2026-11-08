import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

// Created on first use, so a build without the project's URL and key still loads.
// One client per module: only the browser signs in, never the server render.
export function supabase() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Production data source not configured");
  return (client ??= createClient(url, key));
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase().auth.signOut();
  if (error) throw error;
}
