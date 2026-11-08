interface ImportMetaEnv {
  /** Unset, empty or "demo" serves the demo adapter; any other value the production adapter. */
  readonly VITE_DATA_SOURCE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
