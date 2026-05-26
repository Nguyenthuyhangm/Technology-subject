import { type Page, type Locator, expect } from '@playwright/test';
import { APP_SELECTORS } from '../helpers/api-mocks';

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
      waitUntil: 'networkidle',
      timeout: 30000,
    });
  }

  /**
   * Refresh the current page
   */
  async refresh(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
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
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
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
   * Wait for network to be idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
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
    return this.page.locator(APP_SELECTORS.header);
  }

  /**
   * Get the logo locator
   */
  getLogo(): Locator {
    return this.page.locator(APP_SELECTORS.logo);
  }

  /**
   * Get the login button locator
   */
  getLoginButton(): Locator {
    return this.page.locator(APP_SELECTORS.loginButton);
  }

  /**
   * Check if header is visible
   */
  async isHeaderVisible(): Promise<boolean> {
    const header = this.getHeader();
    await expect(header).toBeVisible();
    return header.isVisible();
  }

  /**
   * Check if logo is visible
   */
  async isLogoVisible(): Promise<boolean> {
    const logo = this.getLogo();
    return logo.isVisible().catch(() => false);
  }

  /**
   * Get navigation links count
   */
  async getNavLinksCount(): Promise<number> {
    const nav = this.page.locator(`${APP_SELECTORS.header} nav`);
    return nav.locator('a').count();
  }

  // ==========================================================================
  // AUTH STATE
  // ==========================================================================

  /**
   * Check if user is logged in (authenticated state)
   */
  async isAuthenticated(): Promise<boolean> {
    const isAuth = await this.page.evaluate(() => {
      return localStorage.getItem('mock-authenticated') === 'true';
    });
    return isAuth;
  }

  /**
   * Get current user email from localStorage mock
   */
  async getCurrentUserEmail(): Promise<string | null> {
    return this.page.evaluate(() => {
      try {
        const sessionStr = localStorage.getItem('supabase-auth-token');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          return session?.user?.email ?? null;
        }
      } catch {
        // ignore parse errors
      }
      return null;
    });
  }

  // ==========================================================================
  // FORM INTERACTIONS
  // ==========================================================================

  /**
   * Fill an input field by label or placeholder
   */
  async fillInput(labelOrPlaceholder: string, value: string): Promise<void> {
    // Try by label first
    const label = this.page.locator(`label:has-text("${labelOrPlaceholder}")`);
    const labelCount = await label.count();

    if (labelCount > 0) {
      const inputId = await label.getAttribute('for');
      if (inputId) {
        await this.page.fill(`#${inputId}`, value);
        return;
      }
    }

    // Try by placeholder
    const input = this.page.locator(`input[placeholder*="${labelOrPlaceholder}"]`);
    await input.fill(value);
  }

  /**
   * Click a button by text
   */
  async clickButton(text: string): Promise<void> {
    const button = this.page.locator(`button:has-text("${text}")`);
    await button.click();
  }

  /**
   * Submit a form
   */
  async submitForm(selector: string): Promise<void> {
    await this.page.click(`${selector} button[type="submit"]`);
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
   * Assert element contains text
   */
  async assertContainsText(selector: string, text: string): Promise<void> {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  /**
   * Assert element has exact text
   */
  async assertText(selector: string, text: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveText(text);
  }

  // ==========================================================================
  // CONSOLE LOGGING & DEBUG
  // ==========================================================================

  /**
   * Get all console messages
   */
  async getConsoleMessages(type?: 'log' | 'warn' | 'error'): Promise<string[]> {
    const messages: string[] = [];
    const handler = (msg: import('@playwright/test').ConsoleMessage) => {
      if (!type || msg.type() === type) {
        messages.push(msg.text());
      }
    };
    this.page.on('console', handler);
    return messages;
  }

  /**
   * Capture console errors
   */
  async captureConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await this.page.waitForTimeout(500);
    return errors;
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string): Promise<Buffer | void> {
    return this.page.screenshot({
      path: `./test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  // ==========================================================================
  // LOCAL STORAGE
  // ==========================================================================

  /**
   * Set localStorage value
   */
  async setLocalStorage(key: string, value: string): Promise<void> {
    await this.page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key, value }
    );
  }

  /**
   * Get localStorage value
   */
  async getLocalStorage(key: string): Promise<string | null> {
    return this.page.evaluate(
      (key) => localStorage.getItem(key),
      key
    );
  }

  /**
   * Clear localStorage
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

  /**
   * Scroll element into view
   */
  async scrollIntoView(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }
}

// ============================================================================
// MIXIN for common page interactions
// ============================================================================

export type PageMixin = Pick<
  BasePage,
  | 'goto'
  | 'waitForLoad'
  | 'waitForSelector'
  | 'waitForURL'
  | 'fillInput'
  | 'clickButton'
  | 'assertVisible'
  | 'assertContainsText'
  | 'assertURL'
  | 'isAuthenticated'
  | 'getCurrentUserEmail'
>;
