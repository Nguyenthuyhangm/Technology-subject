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

async function ensureLoggedIn(page: Page): Promise<boolean> {
  const success = await loginAsUser(page, USER.email, USER.password);
  if (!success) test.skip(true, "Đăng nhập thất bại");
  return success;
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe("Luồng Tìm kiếm - Tìm và so sánh giá", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 1: Vào trang search
   */
  test("Vào trang search - Trang load thành công", async ({ page }) => {
    await page.goto("/search", { waitUntil: "domcontentloaded" });

    // Kiểm tra input tìm kiếm hiển thị
    await expect(page.locator(SELECTORS.search.searchInput)).toBeVisible({ timeout: 10000 });
  });

  /**
   * Bước 2: Tìm kiếm với từ khóa - URL cập nhật với query param
   */
  test("Tìm kiếm - Nhập từ khóa và nhấn Enter", async ({ page }) => {
    await page.goto("/search", { waitUntil: "domcontentloaded" });

    // Nhập từ khóa
    await page.fill(SELECTORS.search.searchInput, "kem");
    await page.press(SELECTORS.search.searchInput, "Enter");

    // Đợi kết quả
    await page.waitForTimeout(5000);

    // URL phải chứa query param
    await expect(page).toHaveURL(/q=kem/, { timeout: 15000 });
  });

  /**
   * Bước 3: Kết quả tìm kiếm hiển thị (có sản phẩm hoặc empty state)
   */
  test("Kết quả tìm kiếm - Hiển thị sản phẩm hoặc trạng thái trống", async ({ page }) => {
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    const coSanPham = (await page.locator(SELECTORS.search.productCard).count()) > 0;
    const coEmpty = await page.locator(SELECTORS.search.emptyState).isVisible().catch(() => false);

    // Phải có sản phẩm hoặc hiển thị trạng thái trống
    expect(coSanPham || coEmpty).toBe(true);
  });

  /**
   * Bước 4: Click vào sản phẩm trong kết quả tìm kiếm
   */
  test("Click sản phẩm - Chuyển từ search sang trang chi tiết sản phẩm", async ({ page }) => {
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    // Tìm link sản phẩm đầu tiên
    const productLink = page.locator(SELECTORS.search.productDetailLink).first();
    await expect(productLink).toBeVisible({ timeout: 15000 });

    // Lấy href
    const href = await productLink.getAttribute("href");
    expect(href).toMatch(/\/product\//);

    // Click
    await productLink.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/product\//, { timeout: 15000 });
  });

  /**
   * Bước 5: Tìm kiếm từ trang chủ
   */
  test("Tìm kiếm từ trang chủ - Chuyển sang trang kết quả", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Điền từ khóa vào ô tìm kiếm trên trang chủ
    const homeSearchInput = page.locator(SELECTORS.home.searchInput);
    await homeSearchInput.fill("serum");
    await homeSearchInput.press("Enter");

    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/q=serum/, { timeout: 15000 });
  });
});
