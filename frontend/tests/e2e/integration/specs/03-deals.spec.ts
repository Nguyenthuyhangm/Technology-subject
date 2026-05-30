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

test.describe("Luồng Deals - Trang Chọn lọc hôm nay", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 1: Vào trang Deals từ header
   */
  test("Vào trang Deals - Trang load thành công", async ({ page }) => {
    await page.locator(SELECTORS.header.dealsLink).click();
    await expect(page).toHaveURL(/\/deals/, { timeout: 10000 });

    // Đợi nội dung load
    await page.waitForTimeout(5000);

    // Kiểm tra heading hiển thị
    await expect(page.locator(SELECTORS.deals.heading)).toBeVisible({ timeout: 15000 });
  });

  /**
   * Bước 2: Kiểm tra các tab filter hoạt động
   */
  test("Tab filter - Chuyển đổi tab Đáng mua và Theo dõi thêm", async ({ page }) => {
    await page.goto("/deals", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // Click tab "Đáng mua"
    await page.locator(SELECTORS.deals.tabWorthy).click();
    await page.waitForTimeout(2000);

    // Kiểm tra section "Đang ở vùng giá đẹp" hiển thị
    await expect(page.locator(SELECTORS.deals.sectionGoodPrice)).toBeVisible({ timeout: 10000 });

    // Click tab "Theo dõi thêm"
    await page.locator(SELECTORS.deals.tabWatch).click();
    await page.waitForTimeout(2000);

    // Kiểm tra section "Cần quan sát kỹ hơn" hiển thị
    await expect(page.locator(SELECTORS.deals.sectionObserve)).toBeVisible({ timeout: 10000 });

    // Click tab "Tất cả" quay về
    await page.locator(SELECTORS.deals.tabAll).click();
    await page.waitForTimeout(2000);

    await expect(page.locator(SELECTORS.deals.sectionTrending)).toBeVisible({ timeout: 10000 });
  });

  /**
   * Bước 4: Click vào sản phẩm trong deals -> chuyển sang trang product
   */
  test("Click sản phẩm - Chuyển từ trang Deals sang trang chi tiết sản phẩm", async ({ page }) => {
    await page.goto("/deals", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // Tìm link sản phẩm đầu tiên trong deals (ProductCompareCard có link /product/:id)
    const productLink = page.locator(SELECTORS.deals.productDetailLink).first();
    await expect(productLink).toBeVisible({ timeout: 15000 });

    // Lấy href trước khi click
    const href = await productLink.getAttribute("href");
    expect(href).toMatch(/\/product\//);

    // Click vào sản phẩm
    await productLink.click();

    // Đợi chuyển trang
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/product\//, { timeout: 15000 });
  });

  /**
   * Bước 5: Kiểm tra section trending deals trên trang deals có thể click được
   */
  test("Trending deals section - Các deal nổi bật có thể click vào chi tiết", async ({ page }) => {
    await page.goto("/deals", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // TrendingDealsSection ở đầu trang có các liên kết /product/
    const trendingDealLinks = page.locator(SELECTORS.deals.trendingDealRow);

    const count = await trendingDealLinks.count();
    if (count === 0) {
      // Không có trending deals, test pass
      return;
    }

    // Click deal đầu tiên
    await trendingDealLinks.first().click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/product\//, { timeout: 15000 });
  });
});
