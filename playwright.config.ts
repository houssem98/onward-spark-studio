import { defineConfig } from "@playwright/test";

const PORT = 3418;
const PRODUCTION_PORT = 3419;

export default defineConfig({
  testDir: "e2e",
  workers: 2,
  timeout: 90_000,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: [
    {
      command: `npx vite dev --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}/`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // Timing budgets are measured on a production build: the dev server's own latency is
      // larger than anything motion adds (L10 T6). A Node build, since the deploy target's
      // Cloudflare worker needs wrangler to run locally.
      command: "npx vite build && node .output/server/index.mjs",
      env: { NITRO_PRESET: "node-server", PORT: String(PRODUCTION_PORT) },
      url: `http://localhost:${PRODUCTION_PORT}/`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
