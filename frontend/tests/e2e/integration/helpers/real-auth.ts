import type { Page } from "@playwright/test";
import { SELECTORS } from "./selectors";

/**
 * Test user credentials - Sử dụng tài khoản thật của bạn
 */
export const TEST_USERS = {
  default: {
    email: "trangdinhhuyen269@gmail.com",
    password: "123456",
  },
} as const;

/**
 * Navigate to login page and wait for form to load.
 * NOTE: Uses relative path - Playwright will prepend baseURL from config.
 */
export async function navigateToLogin(page: Page): Promise<void> {
  await page.goto("/login", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // Wait for email input to be visible (form loaded)
  await page.waitForSelector(SELECTORS.auth.emailInput, {
    state: "visible",
    timeout: 15000,
  });
}

/**
 * Fill login form with credentials
 */
export async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.fill(SELECTORS.auth.emailInput, email);
  await page.fill(SELECTORS.auth.passwordInput, password);
}

/**
 * Submit login form
 */
export async function submitLoginForm(page: Page): Promise<void> {
  await page.click(SELECTORS.auth.submitButton);
}

/**
 * Perform full login flow - UI thật với Supabase
 *
 * @param page - Playwright page
 * @param email - User email
 * @param password - User password
 * @returns true if login appears successful, false otherwise
 */
export async function loginAsUser(
  page: Page,
  email: string,
  password: string,
): Promise<boolean> {
  // Navigate to login
  await navigateToLogin(page);

  // Fill credentials
  await fillLoginForm(page, email, password);

  // Submit
  await submitLoginForm(page);

  // Wait for redirect (either to home or show error)
  // The app navigates to '/' on success after login
  try {
    await page.waitForFunction(
      (loginPath) => !window.location.pathname.includes("/login"),
      "/login",
      { timeout: 20000 },
    );

    // Additional wait for app to settle
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Check if we're on home page (not login)
    const currentUrl = page.url();
    return !currentUrl.includes("/login");
  } catch {
    // Login failed - redirect timeout means login did not succeed
    // Log for debugging
    const errorMsg = await getAuthErrorMessage(page);
    console.log(`[loginAsUser] Login failed. Error message: "${errorMsg}"`);

    // Timeout or error means login did NOT succeed - return false
    return false;
  }
}

/**
 * Login as default test user
 */
export async function loginAsTestUser(page: Page): Promise<boolean> {
  const { email, password } = TEST_USERS.default;
  return loginAsUser(page, email, password);
}

/**
 * Perform logout - click logout button in dropdown
 */
export async function logout(page: Page): Promise<void> {
  // Try to find and click avatar/user button
  const userButton = page.locator(SELECTORS.header.userAvatar);
  const isUserButtonVisible = await userButton.isVisible().catch(() => false);

  if (isUserButtonVisible) {
    await userButton.click();
    await page.waitForTimeout(300);

    // Click logout
    const logoutButton = page.locator(SELECTORS.header.logoutButton);
    const isLogoutVisible = await logoutButton.isVisible().catch(() => false);

    if (isLogoutVisible) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Check if user is logged in (by checking for user avatar in header)
 */
export async function isUserLoggedIn(page: Page): Promise<boolean> {
  // Check if login button is visible (not logged in)
  const loginButtonVisible = await page
    .locator(SELECTORS.header.loginButton)
    .isVisible()
    .catch(() => false);

  // Check if user avatar is visible (logged in)
  const avatarVisible = await page
    .locator(SELECTORS.header.userAvatar)
    .isVisible()
    .catch(() => false);

  return avatarVisible && !loginButtonVisible;
}

/**
 * Wait for user to be logged in (after login redirect)
 */
export async function waitForLoggedInState(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      // Check if login button exists in DOM - if not, user is logged in
      const loginButton = document.querySelector("button");
      if (!loginButton) return true;

      const buttonText = loginButton.textContent || "";
      return !buttonText.includes("Đăng nhập");
    },
    { timeout: 20000 },
  );
}

/**
 * Clear all storage and navigate to fresh page
 */
export async function clearAuthAndNavigate(
  page: Page,
  path = "/",
): Promise<void> {
  // Clear localStorage and sessionStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Navigate to fresh page
  await page.goto(path, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
}

/**
 * Create a new browser context with storage state saved
 * Useful for maintaining login across tests
 */
export async function createAuthenticatedContext(
  browser: import("@playwright/test").Browser,
  email: string,
  password: string,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // Login
  const success = await loginAsUser(page, email, password);

  if (!success) {
    throw new Error(
      `Failed to authenticate user: ${email}. Please check credentials and Supabase connection.`,
    );
  }

  // Close the page but keep context (storage state preserved)
  await page.close();

  return context;
}

/**
 * Create authenticated context with default test user
 */
export async function createTestUserContext(
  browser: import("@playwright/test").Browser,
): Promise<BrowserContext> {
  const { email, password } = TEST_USERS.default;
  return createAuthenticatedContext(browser, email, password);
}

/**
 * Wait for auth page to load
 */
export async function waitForAuthPage(page: Page): Promise<void> {
  await page.waitForSelector(SELECTORS.auth.emailInput, {
    state: "visible",
    timeout: 15000,
  });
}

/**
 * Get error message from login form
 */
export async function getAuthErrorMessage(page: Page): Promise<string> {
  try {
    const errorLocator = page.locator(SELECTORS.auth.errorMessage);
    await errorLocator.waitFor({ state: "visible", timeout: 5000 });
    return (await errorLocator.textContent()) || "";
  } catch {
    return "";
  }
}

/**
 * Switch to registration mode
 */
export async function switchToRegisterMode(page: Page): Promise<void> {
  const registerLink = page.locator(SELECTORS.auth.registerLink);
  await registerLink.click();
  await page.waitForTimeout(300);

  // Wait for registration form
  await page.waitForSelector(SELECTORS.auth.nameInput, {
    state: "visible",
    timeout: 5000,
  });
}

/**
 * Switch to login mode
 */
export async function switchToLoginMode(page: Page): Promise<void> {
  const loginLink = page.locator(SELECTORS.auth.loginLink);
  await loginLink.click();
  await page.waitForTimeout(300);

  // Wait for login form
  await page.waitForSelector(SELECTORS.auth.emailInput, {
    state: "visible",
    timeout: 5000,
  });
}
