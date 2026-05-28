import { test, expect } from "@playwright/test";
import {
  navigateToLogin,
  loginAsUser,
  isUserLoggedIn,
  TEST_USERS,
} from "../helpers/real-auth";
import { SELECTORS } from "../helpers/selectors";

const VALID_USER = TEST_USERS.default;

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Sửa lỗi localStorage: navigate trước rồi mới clear
    await page.goto("/", { waitUntil: "domcontentloaded" }).catch(() => {});

    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.log("Storage clear skipped");
      }
    });
  });

  test("01 — Login page loads correctly", async ({ page }) => {
    await navigateToLogin(page);
    await expect(page.locator(SELECTORS.auth.emailInput)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(SELECTORS.auth.passwordInput)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(SELECTORS.auth.submitButton)).toBeVisible({
      timeout: 10000,
    });
  });

  test("02 — Invalid credentials shows error", async ({ page }) => {
    await navigateToLogin(page);
    await page.fill(SELECTORS.auth.emailInput, "wrong@email.com");
    await page.fill(SELECTORS.auth.passwordInput, "wrongpass");
    await page.click(SELECTORS.auth.submitButton);

    await expect(page.locator(SELECTORS.auth.errorMessage)).toBeVisible({
      timeout: 10000,
    });
  });

  test("03 — Successful login with real account", async ({ page }) => {
    const success = await loginAsUser(
      page,
      VALID_USER.email,
      VALID_USER.password,
    );
    expect(success).toBe(true);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator(SELECTORS.header.userAvatar)).toBeVisible({
      timeout: 15000,
    });
  });

  test("04 — User stays logged in after reload", async ({ page }) => {
    const success = await loginAsUser(
      page,
      VALID_USER.email,
      VALID_USER.password,
    );
    if (!success) test.skip(true, "Login failed");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    expect(await isUserLoggedIn(page)).toBe(true);
  });

  test("05 — Wrong password shows error", async ({ page }) => {
    await navigateToLogin(page);
    await page.fill(SELECTORS.auth.emailInput, VALID_USER.email);
    await page.fill(SELECTORS.auth.passwordInput, "wrongpassword123");
    await page.click(SELECTORS.auth.submitButton);

    await page.waitForSelector(SELECTORS.auth.errorMessage, { timeout: 10000 });
    await expect(page.locator(SELECTORS.auth.errorMessage)).toBeVisible();
  });
});
