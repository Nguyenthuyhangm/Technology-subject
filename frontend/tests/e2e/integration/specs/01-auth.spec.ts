import { test, expect, Page } from "@playwright/test";
import {
  navigateToLogin,
  loginAsUser,
  logout,
  isUserLoggedIn,
  TEST_USERS,
} from "../helpers/real-auth";
import { SELECTORS } from "../helpers/selectors";

const USER = TEST_USERS.default;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Xóa storage và quay về trang home
 */
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

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe("Luồng Đăng nhập / Đăng xuất", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
  });

  /**
   * Bước 1: Mở trang đăng nhập và kiểm tra form hiển thị
   */
  test("Mở trang đăng nhập - Form đăng nhập hiển thị đầy đủ", async ({ page }) => {
    await navigateToLogin(page);

    // Kiểm tra các trường form có hiển thị
    await expect(page.locator(SELECTORS.auth.emailInput)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(SELECTORS.auth.passwordInput)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(SELECTORS.auth.submitButton)).toBeVisible({ timeout: 5000 });
  });

  /**
   * Bước 2: Đăng nhập thất bại với thông tin sai
   */
  test("Đăng nhập thất bại - Thông báo lỗi khi nhập sai", async ({ page }) => {
    await navigateToLogin(page);
    await page.fill(SELECTORS.auth.emailInput, "sai@email.com");
    await page.fill(SELECTORS.auth.passwordInput, "saiMatKhau");
    await page.click(SELECTORS.auth.submitButton);

    // Đợi response
    await page.waitForTimeout(2000);

    // Kiểm tra: hoặc hiện lỗi, hoặc vẫn ở trang login (tức login thất bại)
    const coLoi = await page.locator(SELECTORS.auth.errorMessage).isVisible().catch(() => false);
    const vanOTrangLogin = page.url().includes("/login");
    expect(coLoi || vanOTrangLogin).toBe(true);
  });

  /**
   * Bước 3: Đăng nhập thành công với tài khoản thật
   */
  test("Đăng nhập thành công - Chuyển hướng về trang chủ", async ({ page }) => {
    const success = await loginAsUser(page, USER.email, USER.password);
    expect(success).toBe(true);
    await expect(page).not.toHaveURL(/\/login/);
  });

  /**
   * Bước 4: Sau khi đăng nhập, reload trang vẫn giữ trạng thái đăng nhập
   */
  test("Đăng nhập bền vững - Giữ trạng thái sau khi reload", async ({ page }) => {
    const success = await loginAsUser(page, USER.email, USER.password);
    if (!success) test.skip(true, "Login thất bại, bỏ qua test");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    expect(await isUserLoggedIn(page)).toBe(true);
  });

  /**
   * Bước 5: Đăng xuất thành công
   */
  test("Đăng xuất - Quay về trạng thái chưa đăng nhập", async ({ page }) => {
    const success = await loginAsUser(page, USER.email, USER.password);
    if (!success) test.skip(true, "Login thất bại, bỏ qua test");

    await logout(page);
    await page.waitForTimeout(2000);

    // Kiểm tra nút đăng nhập xuất hiện lại
    await expect(page.locator(SELECTORS.header.loginButton)).toBeVisible({ timeout: 10000 });
  });
});
