/**
 * Test Data - Phase 2 Integration Tests
 *
 * Chứa test data và helper functions cho integration tests.
 * KHÔNG chứa mock data - chỉ test data thật.
 */

import type { Page } from '@playwright/test';
import { SELECTORS } from '../helpers/selectors';
import { TEST_USERS } from '../helpers/real-auth';

/**
 * Test user credentials - read from environment
 */
export const TEST_CREDENTIALS = {
  valid: {
    email: process.env.E2E_TEST_EMAIL || TEST_USERS.default.email,
    password: process.env.E2E_TEST_PASSWORD || TEST_USERS.default.password,
  },
  invalid: {
    email: 'invalid@test.com',
    password: 'wrongpassword',
  },
} as const;

/**
 * Navigation test data
 */
export const NAV_ITEMS = [
  { label: 'Trang chủ', path: '/', expectedText: null },
  { label: 'So sánh giá', path: '/search', expectedText: null },
  { label: 'Chọn lọc hôm nay', path: '/deals', expectedText: null },
  { label: 'Yêu thích', path: '/wishlist', expectedText: null },
  { label: 'Theo dõi giá', path: '/alerts', expectedText: null },
] as const;

/**
 * Search test data
 * NOTE: Các query này phải có trong database thật để test pass
 * Nếu database trống, dùng test.skip
 */
export const SEARCH_QUERIES = {
  // Common beauty products that should exist in test database
  valid: [
    'Anessa',
    'Laneige',
    'Serum',
    'Kem chống nắng',
  ],
  // Invalid queries for empty state testing
  invalid: [
    'xyznonexistent12345abc',
    '!!!@@@###',
  ],
} as const;

/**
 * Sort options available in search
 */
export const SORT_OPTIONS = [
  { value: 'best-price', label: 'Giá tốt nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'reviews', label: 'Nhiều đánh giá' },
] as const;

/**
 * Timeouts for different operations
 */
export const TIMEOUTS = {
  navigation: 30000,
  apiCall: 15000,
  uiElement: 10000,
  redirect: 20000,
  formSubmission: 15000,
} as const;

/**
 * Wait helper functions
 */

/**
 * Wait for page to be fully loaded after navigation
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  // Small wait for React to render
  await page.waitForTimeout(500);
}

/**
 * Wait for network to settle (but not too long)
 */
export async function waitForNetworkSettled(page: Page, maxWaitMs = 5000): Promise<void> {
  const startTime = Date.now();
  try {
    await page.waitForLoadState('networkidle', { timeout: maxWaitMs });
  } catch {
    // Network never idle - that's okay for apps with polling
    if (Date.now() - startTime > maxWaitMs) {
      console.log('[E2E] Network did not settle within timeout');
    }
  }
}

/**
 * Check if an element exists in the page
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  const count = await page.locator(selector).count();
  return count > 0;
}

/**
 * Check if element is visible
 */
export async function isElementVisible(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to retry an action a few times
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  delayMs = 500
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await page.waitForTimeout(delayMs);
      }
    }
  }

  throw lastError;
}

// Placeholder for page - will be set in actual tests
let page: Page;

/**
 * Set page reference for retryAction helper
 */
export function setPage(p: Page): void {
  page = p;
}

/**
 * Get current URL
 */
export function getCurrentUrl(page: Page): string {
  return page.url();
}

/**
 * Check if on login page
 */
export function isOnLoginPage(page: Page): boolean {
  return page.url().includes('/login');
}

/**
 * Check if on home page
 */
export function isOnHomePage(page: Page): boolean {
  const url = page.url();
  return url.endsWith('/') || url.endsWith('/#') || url === 'http://localhost:5173/';
}

/**
 * Check if on search page
 */
export function isOnSearchPage(page: Page): boolean {
  return page.url().includes('/search');
}
