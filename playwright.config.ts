import { defineConfig } from "@playwright/test";

const PORT = 3418;

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
  webServer: {
    command: `npx vite dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
