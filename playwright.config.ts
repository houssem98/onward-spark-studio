import { defineConfig } from "@playwright/test";

const PORT = 3418;
const PRODUCTION_PORT = 3419;
// Specs that time the page: frames, long tasks, clickability, layout shift.
const TIMING = /(motion-budget|choreography|navigation)\.spec\.ts$/;

export default defineConfig({
  testDir: "e2e",
  workers: 2,
  timeout: 90_000,
  reporter: "list",
  // A second worker on the same machine moves a timing measure (L10 T8, C22), so the timing specs
  // run after every other spec, one at a time.
  projects: [
    { name: "main", testIgnore: TIMING },
    { name: "timing", testMatch: TIMING, dependencies: ["main"], workers: 1 },
  ],
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
