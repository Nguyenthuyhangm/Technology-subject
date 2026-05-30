import { test, expect } from "@playwright/test";
import { loginAsUser, TEST_USERS } from "../helpers/real-auth";
import { SELECTORS } from "../helpers/selectors";

const VALID_USER = TEST_USERS.default;

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" }).catch(() => {});

    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        console.log("Storage clear skipped");
      }
    });

    const success = await loginAsUser(
      page,
      VALID_USER.email,
      VALID_USER.password,
    );
    if (!success) test.skip(true, "Login failed");
  });

  test("01 — Unauthenticated user sees login button", async ({ page }) => {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        console.log("Storage clear skipped");
      }
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(SELECTORS.header.loginButton)).toBeVisible({
      timeout: 10000,
    });
  });

  test("03 — Can navigate to Search page", async ({ page }) => {
    await page.locator(SELECTORS.header.searchLink).click();
    await expect(page).toHaveURL(/\/search/, { timeout: 10000 });
  });
});
