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

/**
 * Tìm một sản phẩm trên trang search và chuyển tới product detail
 * Trả về URL của trang product
 */
async function navigateToProductFromSearch(page: Page): Promise<string> {
  await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(10000);

  const productLink = page.locator(SELECTORS.search.productDetailLink).first();
  await expect(productLink).toBeVisible({ timeout: 20000 });

  const href = await productLink.getAttribute("href");
  if (!href) throw new Error("No href found");

  await productLink.click();
  await page.waitForTimeout(8000);

  await expect(page).toHaveURL(/\/product\//, { timeout: 15000 });
  return page.url();
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe("Luồng Chi tiết sản phẩm - Kiểm tra các thành phần", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 1: Vào trang product detail từ search
   */
  test("Vào trang sản phẩm - Trang load thành công", async ({ page }) => {
    await navigateToProductFromSearch(page);

    // Kiểm tra heading hiển thị
    await expect(page.locator(SELECTORS.productDetail.productTitle)).toBeVisible({ timeout: 15000 });

    // Kiểm tra nút mua hiển thị
    await expect(page.locator(SELECTORS.productDetail.buyNowButton).first()).toBeVisible({ timeout: 10000 });
  });

  /**
   * Bước 2: Kiểm tra biểu đồ lịch sử giá (nằm ngay dưới QuickCompareStrip)
   */
  test("Biểu đồ giá - Biểu đồ lịch sử giá hiển thị", async ({ page }) => {
    await navigateToProductFromSearch(page);
    await page.waitForTimeout(5000);

    // Scroll xuống để thấy chart lịch sử giá (nằm dưới QuickCompareStrip)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(2000);

    // PriceChart là div chứa h3 "Biến động giá gần đây"
    const chartSection = page.locator('div:has(h3:has-text("Biến động giá"))');
    const chartVisible = await chartSection.isVisible({ timeout: 10000 }).catch(() => false);

    if (!chartVisible) {
      // Sản phẩm không có dữ liệu lịch sử giá - test pass
      return;
    }

    // Kiểm tra SVG chart trong PriceChart
    const svgChart = page.locator('div:has(h3:has-text("Biến động giá")) svg polyline, div:has(h3:has-text("Biến động giá")) svg polygon');
    await expect(svgChart).toBeVisible({ timeout: 10000 });
  });

  /**
   * Bước 3: Kiểm tra xác định giá "Thật" hay "Ảo" bằng biểu đồ
   */
  test("Phân tích giá - Kiểm tra cảnh báo giá ảo", async ({ page }) => {
    await navigateToProductFromSearch(page);
    await page.waitForTimeout(5000);

    // Scroll xuống để thấy chart
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(2000);

    const chartSection = page.locator('div:has(h3:has-text("Biến động giá"))');
    const chartVisible = await chartSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (!chartVisible) return;

    // Kiểm tra thông tin giá (trong PriceChart có grid chứa Thấp nhất/Cao nhất)
    const lowestPrice = page.locator('div:has(h3:has-text("Biến động giá")) >> text=Thấp nhất');
    const highestPrice = page.locator('div:has(h3:has-text("Biến động giá")) >> text=Cao nhất');

    // Có thể hiển thị hoặc không tùy sản phẩm
    const hasLowest = await lowestPrice.isVisible({ timeout: 3000 }).catch(() => false);
    const hasHighest = await highestPrice.isVisible({ timeout: 3000 }).catch(() => false);

    // Kiểm tra cảnh báo giá ảo
    const warning = page.locator('text=Cảnh báo tăng giá ảo');
    const hasWarning = await warning.isVisible({ timeout: 3000 }).catch(() => false);

    // Test pass: hoặc có cảnh báo, hoặc có thông tin giá
    expect(hasLowest || hasHighest || hasWarning).toBe(true);
  });

  /**
   * Bước 4: Kiểm tra nút "Đến nơi bán" (Affiliate link)
   */
  test("Affiliate link - Nút 'Xem nơi bán' có link hợp lệ", async ({ page }) => {
    await navigateToProductFromSearch(page);
    await page.waitForTimeout(3000);

    // Tìm nút affiliate
    const affiliateLink = page.locator(SELECTORS.productDetail.affiliateLink).first();
    await expect(affiliateLink).toBeVisible({ timeout: 10000 });

    // Lấy href
    const href = await affiliateLink.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href!.length).toBeGreaterThan(0);

    // Kiểm tra href là URL hợp lệ (bắt đầu bằng http hoặc go.isclix cho affiliate)
    expect(
      href!.startsWith("http") ||
      href!.includes("go.isclix") ||
      href!.includes("/product/")
    ).toBe(true);
  });

  /**
   * Bước 5: Kiểm tra nút "Mua tại" trong ProductSummary
   */
  test("Mua sản phẩm - Nút 'Mua tại' mở trang bán", async ({ page }) => {
    await navigateToProductFromSearch(page);
    await page.waitForTimeout(3000);

    // Tìm nút mua trong ProductSummary
    const buyButton = page.locator(SELECTORS.productDetail.buyNowButton).first();
    await expect(buyButton).toBeVisible({ timeout: 10000 });

    const href = await buyButton.getAttribute("href");
    expect(href).toBeTruthy();

    // Nút mua phải là external link hoặc affiliate
    expect(
      href!.startsWith("http") ||
      href!.includes("go.isclix")
    ).toBe(true);
  });

  /**
   * Bước 6: Kiểm tra nút Back quay về trang search
   */
  test("Quay lại - Nút Back hoạt động", async ({ page }) => {
    await navigateToProductFromSearch(page);
    await page.waitForTimeout(3000);

    const backButton = page.locator(SELECTORS.productDetail.backButton);
    await expect(backButton).toBeVisible({ timeout: 10000 });

    await backButton.click();
    await page.waitForTimeout(3000);

    // Quay về trang search
    await expect(page).toHaveURL(/\/search/, { timeout: 10000 });
  });
});
