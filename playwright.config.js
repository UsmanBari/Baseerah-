// @ts-check
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8080",
    headless: true,
  },
  webServer: {
    command: "python -m http.server 8080 --bind 127.0.0.1",
    port: 8080,
    reuseExistingServer: true,
    timeout: 10000,
  },
  projects: [
    {
      name: "kiosk-landscape",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "kiosk-portrait",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 800, height: 1280 },
      },
    },
  ],
});
