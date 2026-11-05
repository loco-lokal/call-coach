import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT || 4173);
// Optional: point Chromium projects at an existing browser binary instead of a
// Playwright-managed download (e.g. CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium).
const chromiumLaunch = process.env.CHROMIUM_EXECUTABLE_PATH
  ? { launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } }
  : {};

export const appUrl =
  process.env.CALL_COACH_APP_URL || "https://app.call-coach.test/";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...chromiumLaunch,
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"], ...chromiumLaunch },
    },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run build && npm start",
        url: `http://127.0.0.1:${port}/healthz`,
        reuseExistingServer: !process.env.CI,
        env: { PORT: String(port), CALL_COACH_APP_URL: appUrl },
      },
});
