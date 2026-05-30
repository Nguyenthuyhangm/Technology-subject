import { test, expect, Page } from "@playwright/test";
import { loginAsUser, TEST_USERS } from "../helpers/real-auth";
import { SELECTORS } from "../helpers/selectors";

const VALID_USER = TEST_USERS.default;

async function clickWishlistHeartOnSearch(page: Page): Promise<void> {
  const wishlistHeart = page.locator('[class*="heart"], [class*="wishlist"]').first();
  await wishlistHeart.scrollIntoViewIfNeeded();
  await expect(wishlistHeart).toBeVisible({ timeout: 10000 });
  await wishlistHeart.click();
  await page.waitForTimeout(4000);
}

async function getProductIdFromSearchCard(page: Page, index: number): Promise<string> {
  const productLink = page.locator(SELECTORS.search.productDetailLink).nth(index);
  const href = await productLink.getAttribute("href");
  const match = href?.match(/\/product\/([^/?#]+)/);
  return match ? match[1] : "";
}

async function storeProductIds(page: Page, productIds: string[]): Promise<void> {
  await page.evaluate((ids) => {
    sessionStorage.setItem("test_wishlist_product_ids", JSON.stringify(ids));
  }, productIds);
}

test.describe("Wishlist - Clear existing items", () => {
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
    if (!success) test.skip(true, "Login required for wishlist tests");
  });

  test("01 — Clear existing wishlist items", async ({ page }) => {
    await page.goto("/wishlist", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);
    await expect(page.locator(SELECTORS.wishlist.heading)).toBeVisible({ timeout: 20000 });

    const productCards = page.locator(SELECTORS.wishlist.productCard);
    const productCount = await productCards.count();

    if (productCount === 0) {
      expect(true).toBe(true);
      return;
    }

    for (let i = 0; i < productCount; i++) {
      const removeButton = page.locator(SELECTORS.wishlist.removeButton).first();
      const isVisible = await removeButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await removeButton.scrollIntoViewIfNeeded();
        await removeButton.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.waitForTimeout(4000);
    const remainingProducts = await productCards.count();
    expect(remainingProducts).toBe(0);
  });
});

test.describe("Wishlist - Add items from search", () => {
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
    if (!success) test.skip(true, "Login required for wishlist tests");
  });

  test("02 — Add 1 product to wishlist from search", async ({ page }) => {
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    const productIds: string[] = [];

    for (let i = 0; i < 1; i++) {
      const productId = await getProductIdFromSearchCard(page, i);
      expect(productId).toBeTruthy();
      productIds.push(productId);

      await clickWishlistHeartOnSearch(page);
      await page.waitForTimeout(4000);
    }

    await storeProductIds(page, productIds);
  });
});

test.describe("Wishlist - Verify added items", () => {
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
    if (!success) test.skip(true, "Login required for wishlist tests");
  });

  test("03 — Verify added products in wishlist", async ({ page }) => {
    await page.goto("/wishlist", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);
    await expect(page.locator(SELECTORS.wishlist.heading)).toBeVisible({ timeout: 20000 });

    const productCards = page.locator(SELECTORS.wishlist.productCard);
    const productCount = await productCards.count();

    expect(productCount).toBeGreaterThan(0);
  });
});
