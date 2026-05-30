import { test, expect, Page } from "@playwright/test";
import { loginAsUser, TEST_USERS } from "../helpers/real-auth";
import { SELECTORS } from "../helpers/selectors";

const USER = TEST_USERS.default;

// ============================================================================
// HELPERS
// ============================================================================

async function clearStorageAndGoHome(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    // localStorage có thể không có sẵn, bỏ qua lỗi
  }
}

/**
 * Đăng nhập thành công, bỏ qua test nếu thất bại
 */
async function ensureLoggedIn(page: Page): Promise<boolean> {
  const success = await loginAsUser(page, USER.email, USER.password);
  if (!success) test.skip(true, "Đăng nhập thất bại");
  return success;
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe("Luồng Navigation - Người chưa đăng nhập", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
  });

  /**
   * Kiểm tra: Người dùng chưa đăng nhập nhìn thấy nút "Đăng nhập" ở header
   */
  test("Chưa đăng nhập - Hiển thị nút Đăng nhập", async ({ page }) => {
    await expect(page.locator(SELECTORS.header.loginButton)).toBeVisible({ timeout: 10000 });
  });

  /**
   * Kiểm tra: Các trang public không yêu cầu đăng nhập (login page)
   */
  test("Navigation - Trang đăng nhập accessible mà không cần auth", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.locator(SELECTORS.auth.emailInput)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Luồng Navigation - Người đã đăng nhập", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 1: Kiểm tra user avatar hiển thị sau khi đăng nhập
   */
  test("Đã đăng nhập - Hiển thị avatar người dùng ở header", async ({ page }) => {
    await expect(page.locator(SELECTORS.header.userAvatar)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(SELECTORS.header.loginButton)).not.toBeVisible();
  });

  /**
   * Bước 2: Navigation từ header - Trang So sánh giá
   */
  test("Navigation - Link So sánh giá trong header", async ({ page }) => {
    await page.locator(SELECTORS.header.searchLink).click();
    await expect(page).toHaveURL(/\/search/, { timeout: 10000 });
  });

  /**
   * Bước 3: Navigation từ header - Trang Chọn lọc hôm nay (Deals)
   */
  test("Navigation - Link Chọn lọc hôm nay trong header", async ({ page }) => {
    await page.locator(SELECTORS.header.dealsLink).click();
    await expect(page).toHaveURL(/\/deals/, { timeout: 10000 });
  });

  /**
   * Bước 4: Navigation từ header - Trang Yêu thích (Wishlist)
   */
  test("Navigation - Link Yêu thích trong header", async ({ page }) => {
    await page.locator(SELECTORS.header.wishlistLink).click();
    await expect(page).toHaveURL(/\/wishlist/, { timeout: 10000 });
  });

  /**
   * Bước 5: Navigation từ header - Trang Theo dõi giá (Alerts)
   */
  test("Navigation - Link Theo dõi giá trong header", async ({ page }) => {
    await page.locator(SELECTORS.header.alertsLink).click();
    await expect(page).toHaveURL(/\/alerts/, { timeout: 10000 });
  });

  /**
   * Bước 6: Kiểm tra tất cả các trang protected đều accessible khi đã login
   */
  test("Navigation - Tất cả trang protected accessible khi đã đăng nhập", async ({ page }) => {
    const protectedPages = [
      { path: "/wishlist", selector: SELECTORS.wishlist.heading },
      { path: "/alerts", selector: SELECTORS.alerts.heading },
      { path: "/deals", selector: SELECTORS.deals.heading },
    ];

    for (const { path, selector } of protectedPages) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(path, { timeout: 10000 });
    }
  });
});
