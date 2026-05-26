/**
 * Playwright Config for Phase 2 Integration Tests
 *
 * USAGE:
 * npx playwright test -c tests/e2e/integration/playwright.config.ts
 *
 * This config is designed to run tests from tests/e2e/integration/specs/
 * It extends the root config behavior but can be run independently.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // ============================================================================
  // TEST DIRECTORY - Point to specs folder relative to this config file
  // ============================================================================
  testDir: "./specs",

  // ============================================================================
  // OUTPUT
  // ============================================================================
  // Output test artifacts (screenshots, videos, traces) here
  outputDir: "../../../test-results/integration",

  // ============================================================================
  // TIMEOUTS
  // ============================================================================
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  // ============================================================================
  // PARALLELIZATION
  // ============================================================================
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Use 1 worker for integration tests with real auth to avoid race conditions
  // Multiple workers can cause login/logout/session conflicts
  workers: 1,

  // ============================================================================
  // REPORTS
  // ============================================================================
  // IMPORTANT: outputFolder must be OUTSIDE test-results to avoid clash with artifacts
  // Using ../../../playwright-report/integration resolves to frontend/playwright-report/integration
  reporter: [
    ["html", { outputFolder: "../../../playwright-report/integration" }],
    ["list"],
  ],

  // ============================================================================
  // BASE URL - CRITICAL: Must match root config
  // ============================================================================
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",

    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",

    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",

    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // ============================================================================
  // PROJECTS
  // ============================================================================
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // ============================================================================
  // WEB SERVER - Assumes frontend dev server is already running
  // Or starts it if needed
  // ============================================================================
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
