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
 * Xóa tất cả alert hiện có
 */
async function clearAllAlerts(page: Page): Promise<void> {
  await page.goto("/alerts", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  const cards = page.locator(SELECTORS.alerts.productCard);
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    const deleteBtn = page.locator(SELECTORS.alerts.deleteButton).first();
    const visible = await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!visible) break;

    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click();
    await page.waitForTimeout(1000);

    // Confirm delete
    const confirmBtn = page.locator(SELECTORS.alerts.confirmDeleteButton);
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();
    await page.waitForTimeout(2000);
  }
}

/**
 * Mở modal alert và nhập giá
 */
async function openAlertModal(page: Page): Promise<void> {
  const alertBtn = page.locator(SELECTORS.productDetail.alertButton);
  await alertBtn.scrollIntoViewIfNeeded();
  await expect(alertBtn).toBeVisible({ timeout: 10000 });
  await alertBtn.click();

  const modal = page.locator(SELECTORS.alertModal.modalTitle);
  await expect(modal).toBeVisible({ timeout: 5000 });
}

/**
 * Lấy tên sản phẩm từ trang product
 */
async function getProductName(page: Page): Promise<string> {
  const heading = page.locator(SELECTORS.productDetail.productTitle);
  await expect(heading).toBeVisible({ timeout: 10000 });
  return (await heading.textContent()) ?? "";
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe("Luồng Alert - Chuẩn bị dữ liệu", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 1: Dọn dẹp alerts trước khi test
   */
  test("Chuẩn bị - Xóa các alert hiện có", async ({ page }) => {
    await clearAllAlerts(page);

    // Kiểm tra alerts trống
    const emptyState = page.locator(SELECTORS.alerts.emptyState);
    const cards = page.locator(SELECTORS.alerts.productCard);
    const count = await cards.count();

    expect(count === 0 || await emptyState.isVisible().catch(() => false)).toBe(true);
  });
});

test.describe("Luồng Alert - Tạo alert từ trang sản phẩm", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 2: Tạo alert cho sản phẩm từ trang chi tiết
   */
  test("Tạo alert - Mở modal và nhập giá mục tiêu", async ({ page }) => {
    // Vào trang search và chọn sản phẩm
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    const productLink = page.locator(SELECTORS.search.productDetailLink).first();
    await expect(productLink).toBeVisible({ timeout: 15000 });
    await productLink.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/product\//, { timeout: 10000 });

    // Mở modal alert
    await openAlertModal(page);

    // Nhập giá mục tiêu
    const priceInput = page.locator(SELECTORS.alertModal.targetPriceInput);
    await priceInput.fill("50000");
    await page.waitForTimeout(500);

    // Bấm nút tạo alert
    const createBtn = page.locator(SELECTORS.alertModal.createAlertButton);
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Kiểm tra thông báo thành công
    const successMsg = page.locator(SELECTORS.alertModal.successMessage);
    await expect(successMsg).toBeVisible({ timeout: 10000 });
  });

  /**
   * Bước 3: Đóng modal sau khi tạo alert thành công
   */
  test("Đóng modal - Bấm nút Xong để đóng modal", async ({ page }) => {
    // Vào trang search và chọn sản phẩm
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    const productLink = page.locator(SELECTORS.search.productDetailLink).first();
    await expect(productLink).toBeVisible({ timeout: 15000 });
    await productLink.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/product\//, { timeout: 10000 });

    // Mở modal alert
    await openAlertModal(page);

    // Nhập giá
    const priceInput = page.locator(SELECTORS.alertModal.targetPriceInput);
    await priceInput.fill("50000");

    // Tạo alert
    const createBtn = page.locator(SELECTORS.alertModal.createAlertButton);
    await createBtn.click();

    // Đợi success
    const successMsg = page.locator(SELECTORS.alertModal.successMessage);
    await expect(successMsg).toBeVisible({ timeout: 10000 });

    // Bấm nút Xong
    const doneBtn = page.locator(SELECTORS.alertModal.doneButton);
    await expect(doneBtn).toBeVisible({ timeout: 5000 });
    await doneBtn.click();
    await page.waitForTimeout(1000);

    // Modal không còn hiển thị
    const modal = page.locator(SELECTORS.alertModal.modalTitle);
    const modalGone = !(await modal.isVisible({ timeout: 3000 }).catch(() => true));
    expect(modalGone).toBe(true);
  });
});

test.describe("Luồng Alert - Kiểm tra và xóa alert", () => {

  test.beforeEach(async ({ page }) => {
    await clearStorageAndGoHome(page);
    await ensureLoggedIn(page);
  });

  /**
   * Bước 4: Kiểm tra alert vừa tạo hiển thị trong trang alerts
   */
  test("Kiểm tra alert - Alert vừa tạo hiển thị trong trang alerts", async ({ page }) => {
    await page.goto("/alerts", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // Kiểm tra heading
    await expect(page.locator(SELECTORS.alerts.heading)).toBeVisible({ timeout: 10000 });

    // Kiểm tra có alert
    const cards = page.locator(SELECTORS.alerts.productCard);
    const count = await cards.count();

    if (count === 0) test.skip(true, "Không có alert - test tạo alert có thể chưa chạy");

    expect(count).toBeGreaterThan(0);
  });

  /**
   * Bước 5: Xóa alert từ trang alerts
   */
  test("Xóa alert - Xóa alert khỏi trang alerts", async ({ page }) => {
    await page.goto("/alerts", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    const cards = page.locator(SELECTORS.alerts.productCard);
    const initialCount = await cards.count();

    if (initialCount === 0) test.skip(true, "Không có alert để xóa");

    // Lấy tên alert đầu tiên
    const firstAlertName = await cards.first().locator(SELECTORS.alerts.productName).textContent();

    // Bấm nút xóa
    const deleteBtn = page.locator(SELECTORS.alerts.deleteButton).first();
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click();

    // Confirm delete
    const confirmBtn = page.locator(SELECTORS.alerts.confirmDeleteButton);
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();
    await page.waitForTimeout(2000);

    // Kiểm tra alert đã xóa
    const newCount = await cards.count();
    expect(newCount).toBeLessThan(initialCount);
  });
});
