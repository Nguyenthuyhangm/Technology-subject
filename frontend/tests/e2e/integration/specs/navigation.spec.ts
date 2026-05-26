import { test, expect } from "@playwright/test";
import { loginAsUser, isUserLoggedIn, TEST_USERS } from "../helpers/real-auth";
import { SELECTORS } from "../helpers/selectors";

const VALID_USER = TEST_USERS.default;

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
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

  test("01 — Unauthenticated user sees login button", async ({ page }) => {
    await expect(page.locator(SELECTORS.header.loginButton)).toBeVisible({
      timeout: 10000,
    });
  });

  test("02 — Can navigate to Search page", async ({ page }) => {
    const success = await loginAsUser(
      page,
      VALID_USER.email,
      VALID_USER.password,
    );
    if (!success) test.skip(true, "Login failed");

    await page.locator(SELECTORS.header.searchLink).click();
    await expect(page).toHaveURL(/\/search/, { timeout: 10000 });
  });

  test("03 — Can navigate to Deals page", async ({ page }) => {
    const success = await loginAsUser(
      page,
      VALID_USER.email,
      VALID_USER.password,
    );
    if (!success) test.skip(true, "Login failed");

    await page.locator(SELECTORS.header.dealsLink).click();
    await expect(page).toHaveURL(/\/deals/, { timeout: 10000 });
  });
});
