/**
 * Playwright E2E Test Configuration
 * PriceHawk Application
 *
 * USAGE:
 * - All tests:        npx playwright test
 * - Integration only: npx playwright test -c tests/e2e/integration/playwright.config.ts
 * - With UI:         npx playwright test --ui
 *
 * REQUIREMENTS:
 * - Frontend dev server at localhost:5173
 * - Backend API at localhost:8080 (for integration tests)
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // ============================================================================
  // TEST DIRECTORY - This is the MAIN config at frontend root
  // ============================================================================
  testDir: './tests/e2e',

  // ============================================================================
  // OUTPUT DIRECTORY
  // ============================================================================
  outputDir: './test-results',

  // ============================================================================
  // REPORTS - Must be OUTSIDE test-results to avoid clash
  // ============================================================================
  reporter: [
    ['html', { outputFolder: './playwright-report' }],
    ['json', { outputFile: './playwright-report/test-results.json' }],
    ['list'],
  ],

  // ============================================================================
  // TIMEOUTS
  // ============================================================================
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  // ============================================================================
  // RETRY & PARALLELIZATION - Use 1 worker to avoid memory issues
  // ============================================================================
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  fullyParallel: false,

  // ============================================================================
  // BASE URL - CRITICAL FOR PAGE.GOTO()
  // ============================================================================
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,

    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    permissions: [],

    launchOptions: {
      args: ['--disable-dev-shm-usage'],
    },
  },

  // ============================================================================
  // PROJECTS
  // ============================================================================
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        headless: process.env.CI ? true : false,
      },
    },
  ],

  // ============================================================================
  // WEB SERVER (starts dev server automatically)
  // ============================================================================
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
