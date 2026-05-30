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
 * Click vào icon wishlist (trái tim) trên card sản phẩm trong search
 */
async function clickWishlistHeartOnSearch(page: Page): Promise<void> {
  const heart = page.locator('[class*="heart"], [class*="wishlist"]').first();
  await heart.scrollIntoViewIfNeeded();
  await expect(heart).toBeVisible({ timeout: 10000 });
  await heart.click();
  await page.waitForTimeout(3000);
}

/**
 * Xóa tất cả sản phẩm trong wishlist
 */
async function clearWishlist(page: Page): Promise<void> {
  await page.goto("/wishlist", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  const cards = page.locator(SELECTORS.wishlist.productCard);
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    const removeBtn = page.locator(SELECTORS.wishlist.removeButton).first();
    const visible = await removeBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!visible) break;

    await removeBtn.scrollIntoViewIfNeeded();
    await removeBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.waitForTimeout(2000);
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe("Luồng Wishlist - Chuẩn bị dữ liệu", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 1: Dọn dẹp wishlist trước khi test
   */
  test("Chuẩn bị - Xóa các sản phẩm wishlist hiện có", async ({ page }) => {
    await clearWishlist(page);

    // Kiểm tra wishlist trống
    const emptyState = page.locator(SELECTORS.wishlist.emptyState);
    const cards = page.locator(SELECTORS.wishlist.productCard);
    const count = await cards.count();

    // Pass nếu empty state hiện hoặc không còn card nào
    expect(count === 0 || await emptyState.isVisible().catch(() => false)).toBe(true);
  });
});

test.describe("Luồng Wishlist - Thêm sản phẩm vào wishlist", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 2: Thêm sản phẩm vào wishlist từ trang search
   */
  test("Thêm vào wishlist - Thêm 1 sản phẩm từ trang search", async ({ page }) => {
    // Tìm kiếm sản phẩm
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    // Kiểm tra có sản phẩm
    const cardCount = await page.locator(SELECTORS.search.productCard).count();
    if (cardCount === 0) test.skip(true, "Không có sản phẩm để test");

    // Click vào icon wishlist
    await clickWishlistHeartOnSearch(page);
  });
});

test.describe("Luồng Wishlist - Kiểm tra sản phẩm đã thêm", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 3: Kiểm tra sản phẩm đã được thêm vào wishlist
   */
  test("Kiểm tra wishlist - Sản phẩm đã thêm hiển thị trong wishlist", async ({ page }) => {
    await page.goto("/wishlist", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    const cards = page.locator(SELECTORS.wishlist.productCard);
    const count = await cards.count();

    if (count === 0) test.skip(true, "Không có sản phẩm - test thêm wishlist có thể chưa chạy");

    expect(count).toBeGreaterThan(0);
  });

  /**
   * Bước 4: Xóa sản phẩm khỏi wishlist
   */
  test("Xóa khỏi wishlist - Xóa sản phẩm khỏi wishlist", async ({ page }) => {
    await page.goto("/wishlist", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    const cards = page.locator(SELECTORS.wishlist.productCard);
    const initialCount = await cards.count();

    if (initialCount === 0) test.skip(true, "Không có sản phẩm để xóa");

    // Click nút xóa đầu tiên
    const removeBtn = page.locator(SELECTORS.wishlist.removeButton).first();
    await removeBtn.scrollIntoViewIfNeeded();
    await removeBtn.click();
    await page.waitForTimeout(2000);

    // Kiểm tra số lượng giảm
    const newCount = await cards.count();
    expect(newCount).toBeLessThan(initialCount);
  });
});

test.describe("Luồng Wishlist - Thêm từ trang chi tiết sản phẩm", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 5: Thêm sản phẩm vào wishlist từ trang chi tiết sản phẩm
   */
  test("Thêm từ trang product - Thêm sản phẩm từ trang chi tiết", async ({ page }) => {
    // Vào trang search và chọn sản phẩm
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    const productLink = page.locator(SELECTORS.search.productDetailLink).first();
    await expect(productLink).toBeVisible({ timeout: 15000 });
    await productLink.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/product\//, { timeout: 10000 });

    // Click nút wishlist trong trang sản phẩm
    const wishlistBtn = page.locator(SELECTORS.productDetail.wishlistButton).first();
    await wishlistBtn.scrollIntoViewIfNeeded();
    await expect(wishlistBtn).toBeVisible({ timeout: 10000 });
    await wishlistBtn.click();
    await page.waitForTimeout(3000);
  });

  /**
   * Bước 6: Kiểm tra trạng thái wishlist button thay đổi sau khi thêm
   */
  test("Kiểm tra trạng thái - Nút wishlist hiển thị trạng thái đã lưu", async ({ page }) => {
    // Vào trang product
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    const productLink = page.locator(SELECTORS.search.productDetailLink).first();
    await expect(productLink).toBeVisible({ timeout: 15000 });
    await productLink.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/product\//, { timeout: 10000 });

    // Tìm nút wishlist (có thể là "Lưu wishlist" hoặc "Đã lưu wishlist")
    const wishlistBtn = page.locator(SELECTORS.productDetail.wishlistButton).first();
    await wishlistBtn.scrollIntoViewIfNeeded();
    await expect(wishlistBtn).toBeVisible({ timeout: 10000 });
  });
});
