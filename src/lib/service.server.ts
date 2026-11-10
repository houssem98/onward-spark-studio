import { createClient } from "@supabase/supabase-js";

// The server's own Supabase client, with the service-role key the human sets as a server secret;
// null until both are set. Never imported by the browser.
export const env = (name: string) => process.env[name] || undefined;

export function serviceClient() {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return url && key ? createClient(url, key) : null;
}
