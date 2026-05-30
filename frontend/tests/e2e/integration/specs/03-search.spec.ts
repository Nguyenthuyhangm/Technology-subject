import { test, expect } from "@playwright/test";
import { loginAsUser, TEST_USERS } from "../helpers/real-auth";
import { SELECTORS } from "../helpers/selectors";

const VALID_USER = TEST_USERS.default;

test.describe("Search Functionality", () => {
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

    const success = await loginAsUser(
      page,
      VALID_USER.email,
      VALID_USER.password,
    );
    if (!success) test.skip(true, "Login required for search tests");
  });

  test("01 — Search updates URL with query param", async ({ page }) => {
    await page.goto("/search", { waitUntil: "domcontentloaded" });
    await page.fill(SELECTORS.search.searchInput, "kem");
    await page.press(SELECTORS.search.searchInput, "Enter");

    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/q=kem/, { timeout: 15000 });
  });

  test("02 — Shows results or empty state", async ({ page }) => {
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(15000);

    const hasResults =
      (await page.locator(SELECTORS.search.productCard).count()) > 0;
    const hasEmpty = await page
      .locator(SELECTORS.search.emptyState)
      .isVisible()
      .catch(() => false);

    expect(hasResults || hasEmpty).toBe(true);
  });

  test("03 — Click product from search to product detail page", async ({ page }) => {
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    const firstProductLink = page.locator(SELECTORS.search.productDetailLink).first();
    await expect(firstProductLink).toBeVisible({ timeout: 15000 });
    await firstProductLink.click();

    await page.waitForTimeout(10000);
    await expect(page).toHaveURL(/\/product\//, { timeout: 15000 });
  });
});
