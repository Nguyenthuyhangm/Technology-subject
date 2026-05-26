/**
 * Login Page - Phase 2 Integration Tests
 *
 * Page Object cho AuthPage.tsx
 * Sử dụng SELECTORS từ helpers/selectors.ts.
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

// ============================================================================
// SELECTORS - Dựa trên UI thật của AuthPage.tsx
// ============================================================================

const AUTH_SELECTORS = {
  // Form inputs (dựa trên name attribute)
  emailInput: 'input[name="email"]',
  passwordInput: 'input[name="password"]',
  nameInput: 'input[name="name"]',
  phoneInput: 'input[name="phone"]',

  // Buttons
  submitButton: 'button[type="submit"]',
  googleButton: 'button:has-text("Tiếp tục với Google")',

  // Mode switching
  registerLink: 'button:has-text("Đăng ký ngay")',
  loginLink: 'button:has-text("Đăng nhập ngay")',
  forgotPasswordButton: 'button:has-text("Quên mật khẩu?")',
  backToLogin: 'button:has-text("Quay lại Đăng nhập")',

  // Headings
  loginHeading: 'h1:has-text("Đăng nhập")',
  registerHeading: 'h1:has-text("Đăng ký")',
  forgotPasswordHeading: 'h1:has-text("Quên mật khẩu")',

  // Messages
  errorMessage: 'p:text-matches("lỗi|không đúng|không hợp lệ", "i")',

  // Divider
  dividerText: 'text=hoặc',
} as const;

// ============================================================================
// LOGIN PAGE
// ============================================================================

export class LoginPage extends BasePage {
  // --------------------------------------------------------------------------
  // LOCATORS
  // --------------------------------------------------------------------------

  private get emailInput(): Locator {
    return this.page.locator(AUTH_SELECTORS.emailInput);
  }

  private get passwordInput(): Locator {
    return this.page.locator(AUTH_SELECTORS.passwordInput);
  }

  private get nameInput(): Locator {
    return this.page.locator(AUTH_SELECTORS.nameInput);
  }

  private get phoneInput(): Locator {
    return this.page.locator(AUTH_SELECTORS.phoneInput);
  }

  private get submitButton(): Locator {
    return this.page.locator(AUTH_SELECTORS.submitButton);
  }

  private get googleButton(): Locator {
    return this.page.locator(AUTH_SELECTORS.googleButton);
  }

  private get errorMessage(): Locator {
    return this.page.locator(AUTH_SELECTORS.errorMessage);
  }

  // --------------------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------------------

  constructor(page: Page) {
    super(page);
  }

  // --------------------------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------------------------

  /**
   * Navigate to login page.
   * Uses relative path - Playwright prepends baseURL from config automatically.
   */
  async goto(): Promise<void> {
    await this.page.goto('/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for form to load
    await this.waitForSelector(AUTH_SELECTORS.emailInput, {
      state: 'visible',
      timeout: 15000,
    });
  }

  // --------------------------------------------------------------------------
  // FORM ACTIONS
  // --------------------------------------------------------------------------

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.emailInput.fill(email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.passwordInput.fill(password);
  }

  /**
   * Fill name field (for registration)
   */
  async fillName(name: string): Promise<void> {
    await this.nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.nameInput.fill(name);
  }

  /**
   * Fill phone field (for registration)
   */
  async fillPhone(phone: string): Promise<void> {
    await this.phoneInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.phoneInput.fill(phone);
  }

  /**
   * Submit login form
   */
  async submitLogin(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submitButton.click();
  }

  // --------------------------------------------------------------------------
  // MODE SWITCHING
  // --------------------------------------------------------------------------

  /**
   * Switch to register mode
   */
  async switchToRegister(): Promise<void> {
    await this.page.locator(AUTH_SELECTORS.registerLink).click();
    await this.waitForTimeout(300);
    await this.nameInput.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Switch to login mode
   */
  async switchToLogin(): Promise<void> {
    await this.page.locator(AUTH_SELECTORS.loginLink).click();
    await this.waitForTimeout(300);
    await this.emailInput.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Go to forgot password mode
   */
  async switchToForgotPassword(): Promise<void> {
    await this.page.locator(AUTH_SELECTORS.forgotPasswordButton).click();
    await this.waitForTimeout(300);
    await this.page.locator(AUTH_SELECTORS.forgotPasswordHeading).waitFor({
      state: 'visible',
      timeout: 5000,
    });
  }

  /**
   * Return to login from forgot password
   */
  async backToLoginFromForgotPassword(): Promise<void> {
    await this.page.locator(AUTH_SELECTORS.backToLogin).click();
    await this.waitForTimeout(300);
  }

  // --------------------------------------------------------------------------
  // VALIDATION
  // --------------------------------------------------------------------------

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    try {
      return (await this.errorMessage.textContent()) || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if page has loaded correctly
   */
  async assertPageLoaded(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toContainText('Đăng nhập');
  }

  /**
   * Check if registration page is loaded
   */
  async assertRegistrationPageLoaded(): Promise<void> {
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toContainText('Đăng ký');
  }

  /**
   * Check if forgot password page is loaded
   */
  async assertForgotPasswordPageLoaded(): Promise<void> {
    await expect(this.page.locator(AUTH_SELECTORS.forgotPasswordHeading)).toBeVisible();
    await expect(this.emailInput).toBeVisible();
  }

  /**
   * Get page heading text
   */
  async getHeadingText(): Promise<string> {
    const heading = this.page.locator('h1').first();
    return (await heading.textContent()) || '';
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
    try {
      await this.nameInput.clear();
      await this.phoneInput.clear();
    } catch {
      // Name and phone might not exist in login mode
    }
  }

  /**
   * Check if redirect happened after login attempt
   */
  async wasRedirectedAfterLogin(): Promise<boolean> {
    const currentUrl = this.page.url();
    return !currentUrl.includes('/login');
  }
}

// Export selectors for external use
export { AUTH_SELECTORS };
