/**
 * Base Page - Phase 2 Integration Tests
 *
 * Abstract Page Object Model cho integration tests.
 * Sử dụng SELECTORS từ helpers/selectors.ts.
 */

import { type Page, type Locator, expect } from '@playwright/test';

// ============================================================================
// BASE PAGE - Abstract Page Object Model
// ============================================================================

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  /**
   * Navigate to the page URL.
   * Uses relative path - Playwright prepends baseURL from config automatically.
   */
  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  }

  /**
   * Refresh the current page
   */
  async refresh(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  // ==========================================================================
  // WAITING
  // ==========================================================================

  /**
   * Wait for page to be fully loaded
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(500); // React render time
  }

  /**
   * Wait for specific element to be visible
   */
  async waitForSelector(
    selector: string,
    options?: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' }
  ): Promise<void> {
    await this.page.waitForSelector(selector, {
      state: options?.state ?? 'visible',
      timeout: options?.timeout ?? 10000,
    });
  }

  /**
   * Wait for URL to match pattern
   */
  async waitForURL(pattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(pattern, { timeout: 10000 });
  }

  /**
   * Wait for a specific time (use sparingly)
   */
  async waitForTimeout(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  // ==========================================================================
  // HEADER ELEMENTS
  // ==========================================================================

  /**
   * Get the page header locator
   */
  getHeader(): Locator {
    return this.page.locator('header');
  }

  /**
   * Get the logo locator
   */
  getLogo(): Locator {
    return this.page.locator('header a:has-text("Price"), header a:has-text("Hawk")');
  }

  /**
   * Get the login button locator
   */
  getLoginButton(): Locator {
    return this.page.locator('button:has-text("Đăng nhập")');
  }

  /**
   * Check if header is visible
   */
  async isHeaderVisible(): Promise<boolean> {
    const header = this.getHeader();
    return header.isVisible().catch(() => false);
  }

  /**
   * Check if logo is visible
   */
  async isLogoVisible(): Promise<boolean> {
    const logo = this.getLogo();
    return logo.isVisible().catch(() => false);
  }

  // ==========================================================================
  // AUTH STATE
  // ==========================================================================

  /**
   * Check if user is logged in (by checking for login button)
   */
  async isAuthenticated(): Promise<boolean> {
    const loginButton = this.page.locator('button:has-text("Đăng nhập")');
    const loginVisible = await loginButton.isVisible().catch(() => false);
    return !loginVisible;
  }

  // ==========================================================================
  // FORM INTERACTIONS
  // ==========================================================================

  /**
   * Fill an input field
   */
  async fillInput(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  /**
   * Click a button by text
   */
  async clickButton(text: string): Promise<void> {
    const button = this.page.locator(`button:has-text("${text}")`);
    await button.click();
  }

  // ==========================================================================
  // ASSERTIONS
  // ==========================================================================

  /**
   * Assert current URL matches expected
   */
  async assertURL(expected: string | RegExp): Promise<void> {
    if (expected instanceof RegExp) {
      await expect(this.page).toHaveURL(expected);
    } else {
      await expect(this.page).toHaveURL(new RegExp(expected));
    }
  }

  /**
   * Assert element is visible
   */
  async assertVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  // ==========================================================================
  // LOCAL STORAGE (only after page has loaded)
  // ==========================================================================

  /**
   * Set localStorage value (ONLY after page has loaded)
   */
  async setLocalStorage(key: string, value: string): Promise<void> {
    await this.page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key, value }
    );
  }

  /**
   * Get localStorage value (ONLY after page has loaded)
   */
  async getLocalStorage(key: string): Promise<string | null> {
    return this.page.evaluate(
      (key) => localStorage.getItem(key),
      key
    );
  }

  /**
   * Clear localStorage (ONLY after page has loaded)
   */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  // ==========================================================================
  // SCROLLING
  // ==========================================================================

  /**
   * Scroll to top of page
   */
  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * Scroll to bottom of page
   */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
}
