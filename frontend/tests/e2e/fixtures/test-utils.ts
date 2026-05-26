import { test as base, type Page, type BrowserContext, expect } from '@playwright/test';
import {
  setupApiMocks,
  setupAuthenticatedPage,
  mockAllApiRoutes,
  mockApiRoute,
  clearMocks,
  setAuthState,
  clearAuthState,
  waitForAuthenticatedPage,
  MOCK_USER,
  MOCK_SESSION,
  APP_SELECTORS,
} from '../helpers/api-mocks';

// ============================================================================
// CUSTOM FIXTURES
// ============================================================================

export interface AuthenticatedPage {
  page: Page;
  user: typeof MOCK_USER;
}

export interface FreshContext {
  context: BrowserContext;
  page: Page;
}

/**
 * Create a fresh browser context with mocked APIs.
 * Use this for tests that need a clean slate.
 */
async function createFreshContext(
  browser: import('@playwright/test').Browser
): Promise<FreshContext> {
  const context = await browser.newContext({
    // Viewport settings
    viewport: { width: 1280, height: 720 },
    // Geographic settings
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    // Permissions
    permissions: [],
    // Storage state for persistence
    storageState: undefined,
  });

  const page = await context.newPage();

  // Setup API mocks
  setupApiMocks(page);

  return { context, page };
}

/**
 * Create an authenticated page with full API mocking.
 * Use this for tests that require a logged-in user.
 */
async function createAuthenticatedPage(
  browser: import('@playwright/test').Browser
): Promise<AuthenticatedPage> {
  const { page } = await createFreshContext(browser);

  // Setup additional route mocks
  await mockAllApiRoutes(page);

  // Navigate to home with auth
  await setupAuthenticatedPage(page);

  return { page, user: MOCK_USER };
}

// ============================================================================
// CUSTOM TEST EXTENSION
// ============================================================================

export const test = base.extend<{
  // Fresh unauthenticated page
  freshPage: Page;
  // Authenticated page with all mocks
  authenticatedPage: Page;
  // Custom fixture for authenticated user data
  mockUser: typeof MOCK_USER;
}>({
  // Provide mock user data to all tests
  mockUser: MOCK_USER,

  // Fresh page fixture - clean slate, no auth
  freshPage: async ({ browser }, use) => {
    const { page } = await createFreshContext(browser);
    await use(page);
    await page.close();
  },

  // Authenticated page fixture - logged in with all mocks
  authenticatedPage: async ({ browser }, use) => {
    const { page } = await createFreshContext(browser);

    // Setup all API mocks for authenticated state
    await mockAllApiRoutes(page);
    setupApiMocks(page);

    await use(page);
    await page.close();
  },
});

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

export const assertions = {
  /**
   * Check if element is visible with timeout
   */
  async toBeVisible(page: Page, selector: string, timeout = 5000): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  },

  /**
   * Check if element is hidden with timeout
   */
  async toBeHidden(page: Page, selector: string, timeout = 5000): Promise<void> {
    await page.waitForSelector(selector, { state: 'hidden', timeout });
  },

  /**
   * Check if URL contains expected path
   */
  async toHaveURL(page: Page, expected: string | RegExp): Promise<void> {
    if (expected instanceof RegExp) {
      await page.waitForURL(expected, { timeout: 10000 });
    } else {
      await page.waitForURL(`**${expected}**`, { timeout: 10000 });
    }
  },

  /**
   * Check if page has no console errors (Error level only)
   */
  async toHaveNoConsoleErrors(page: Page): Promise<void> {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any async errors
    await page.waitForTimeout(1000);

    // Filter out known acceptable errors (like 3rd party script errors)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('manifest') &&
        !e.includes('third-party')
    );

    expect(criticalErrors).toHaveLength(0);
  },
};

// ============================================================================
// ACTION HELPERS
// ============================================================================

export const actions = {
  /**
   * Click element with retry logic
   */
  async click(page: Page, selector: string, options?: { retries?: number; delay?: number }): Promise<void> {
    const retries = options?.retries ?? 3;
    const delay = options?.delay ?? 100;

    for (let i = 0; i < retries; i++) {
      try {
        await page.click(selector, { timeout: 5000 });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await page.waitForTimeout(delay);
      }
    }
  },

  /**
   * Fill input with retry logic
   */
  async fill(page: Page, selector: string, value: string): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
    await page.fill(selector, value);
  },

  /**
   * Submit form
   */
  async submitForm(page: Page, selector: string): Promise<void> {
    await page.click(`${selector} button[type="submit"]`);
  },

  /**
   * Navigate and wait for load
   */
  async navigateAndWait(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
  },
};

// ============================================================================
// EXPORT TEST UTILS
// ============================================================================

export {
  setAuthState,
  clearAuthState,
  setupApiMocks,
  mockAllApiRoutes,
  mockApiRoute,
  clearMocks,
  waitForAuthenticatedPage,
  APP_SELECTORS,
  MOCK_USER,
  MOCK_SESSION,
};

// Re-export test for convenience
export { expect } from '@playwright/test';
