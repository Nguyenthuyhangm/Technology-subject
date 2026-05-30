import { test, expect, Page } from "@playwright/test";
import { loginAsUser, logout, TEST_USERS } from "../helpers/real-auth";
import { SELECTORS } from "../helpers/selectors";

const VALID_USER = TEST_USERS.default;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Lấy product ID từ URL hiện tại
 */
async function getProductId(page: Page): Promise<string> {
  const url = page.url();
  const match = url.match(/\/product\/([^/?#]+)/);
  return match ? match[1] : "";
}

/**
 * Lấy tên sản phẩm từ trang product detail
 */
async function getProductName(page: Page): Promise<string> {
  const heading = page.locator("h1").first();
  await expect(heading).toBeVisible({ timeout: 10000 });
  return await heading.textContent() ?? "";
}

/**
 * Xóa tất cả alerts hiện có (để cleanup trước khi test)
 */
async function clearAllAlerts(page: Page): Promise<void> {
  await page.goto("/alerts", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  const alertCards = page.locator(SELECTORS.alerts.productCard);
  const alertCount = await alertCards.count();

  for (let i = 0; i < alertCount; i++) {
    const deleteButton = page.locator(SELECTORS.alerts.deleteButton).first();
    const isVisible = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVisible) {
      await deleteButton.scrollIntoViewIfNeeded();
      await deleteButton.click();
      await page.waitForTimeout(1000);

      // Confirm delete
      const confirmButton = page.locator(SELECTORS.alerts.confirmDeleteButton);
      await expect(confirmButton).toBeVisible({ timeout: 5000 });
      await confirmButton.click();
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Mở modal đặt alert và nhập giá
 */
async function setAlertWithPrice(page: Page, targetPrice: string): Promise<string> {
  // Bấm nút "Đặt alert"
  const alertButton = page.locator(SELECTORS.productDetail.alertButton);
  await alertButton.scrollIntoViewIfNeeded();
  await expect(alertButton).toBeVisible({ timeout: 10000 });
  await alertButton.click();

  // Đợi modal hiện ra
  const modal = page.locator(SELECTORS.alertModal.modalTitle);
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Lấy tên sản phẩm
  const productName = await getProductName(page);

  // Nhập giá mục tiêu
  const priceInput = page.locator(SELECTORS.alertModal.targetPriceInput);
  await priceInput.scrollIntoViewIfNeeded();
  await priceInput.fill(targetPrice);
  await page.waitForTimeout(500);

  // Bấm nút tạo alert
  const createButton = page.locator(SELECTORS.alertModal.createAlertButton);
  await expect(createButton).toBeVisible({ timeout: 5000 });
  await createButton.click();

  // Đợi success message
  const successMessage = page.locator(SELECTORS.alertModal.successMessage);
  await expect(successMessage).toBeVisible({ timeout: 10000 });

  // Bấm nút "Xong" để đóng modal
  const doneButton = page.locator(SELECTORS.alertModal.doneButton);
  await expect(doneButton).toBeVisible({ timeout: 5000 });
  await doneButton.click();
  await page.waitForTimeout(1000);

  return productName;
}

/**
 * Nhập thông tin cần thiết và tạo alert
 */
async function fillAlertFormAndCreate(page: Page, targetPrice: string): Promise<string> {
  // Bấm nút "Đặt alert"
  const alertButton = page.locator(SELECTORS.productDetail.alertButton);
  await alertButton.scrollIntoViewIfNeeded();
  await expect(alertButton).toBeVisible({ timeout: 10000 });
  await alertButton.click();

  // Đợi modal hiện ra
  const modal = page.locator(SELECTORS.alertModal.modalTitle);
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Lấy tên sản phẩm
  const productName = await getProductName(page);

  // Nhập giá mục tiêu 50000
  const priceInput = page.locator(SELECTORS.alertModal.targetPriceInput);
  await priceInput.scrollIntoViewIfNeeded();
  await priceInput.fill(targetPrice);
  await page.waitForTimeout(500);

  // Bấm nút tạo alert
  const createButton = page.locator(SELECTORS.alertModal.createAlertButton);
  await expect(createButton).toBeVisible({ timeout: 5000 });
  await createButton.click();

  // Đợi success message
  const successMessage = page.locator(SELECTORS.alertModal.successMessage);
  await expect(successMessage).toBeVisible({ timeout: 10000 });

  // Bấm nút "Xong" để đóng modal
  const doneButton = page.locator(SELECTORS.alertModal.doneButton);
  await expect(doneButton).toBeVisible({ timeout: 5000 });
  await doneButton.click();
  await page.waitForTimeout(1000);

  return productName;
}

/**
 * Kiểm tra sản phẩm có trong danh sách alerts không
 */
async function isProductInAlerts(page: Page, productName: string): Promise<boolean> {
  try {
    const alertCard = page.locator(SELECTORS.alerts.productCard).filter({ hasText: productName });
    return await alertCard.isVisible({ timeout: 3000 });
  } catch {
    return false;
  }
}

/**
 * Xóa alert của sản phẩm cụ thể
 */
async function deleteAlertByProductName(page: Page, productName: string): Promise<void> {
  const alertCard = page.locator(SELECTORS.alerts.productCard).filter({ hasText: productName });
  await expect(alertCard).toBeVisible({ timeout: 10000 });

  const deleteButton = alertCard.locator(SELECTORS.alerts.deleteButton);
  await deleteButton.scrollIntoViewIfNeeded();
  await deleteButton.click();

  // Confirm delete
  const confirmButton = page.locator(SELECTORS.alerts.confirmDeleteButton);
  await expect(confirmButton).toBeVisible({ timeout: 5000 });
  await confirmButton.click();
  await page.waitForTimeout(2000);
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe("Alert - Setup: Clear existing alerts", () => {
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
    if (!success) test.skip(true, "Login required for alert tests");
  });

  /**
   * Test 01: Clear all existing alerts before running main tests
   */
  test("01 — Clear existing alerts", async ({ page }) => {
    await clearAllAlerts(page);

    // Wait a bit for UI to update
    await page.waitForTimeout(1000);

    // Either empty state shows OR count is 0
    const emptyState = page.locator(SELECTORS.alerts.emptyState);
    const alertCount = await page.locator(SELECTORS.alerts.productCard).count();

    expect(alertCount === 0 || await emptyState.isVisible().catch(() => false)).toBe(true);
  });
});

test.describe("Alert - Create alert from product detail", () => {
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
    if (!success) test.skip(true, "Login required for alert tests");
  });

  /**
   * Test 02: Search for "kem", click on first product, set alert
   * - Đặt alert thành công là pass
   */
  test("02 — Search kem and set alert on first product", async ({ page }) => {
    // Step 1: Search for "kem"
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    // Click vào sản phẩm đầu tiên
    const firstProductLink = page.locator(SELECTORS.search.productDetailLink).first();
    await expect(firstProductLink).toBeVisible({ timeout: 20000 });
    await firstProductLink.click();

    // Đợi trang product detail load
    await page.waitForTimeout(10000);

    // Verify URL chuyển sang product detail
    await expect(page).toHaveURL(/\/product\//);

    // Step 2: Đặt alert với giá mục tiêu 50000
    const productName = await fillAlertFormAndCreate(page, "50000");

    // Verify alert đã được tạo thành công (modal hiển thị thông báo thành công)
    // Test đã pass nếu không có exception ở trên
    expect(productName).toBeTruthy();
  });
});

test.describe("Alert - Verify and delete alert", () => {
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
    if (!success) test.skip(true, "Login required for alert tests");
  });

  /**
   * Test 03: Navigate to alerts page and verify product is displayed
   * - Chuyển sang trang alerts thấy sản phẩm vừa thêm là pass
   */
  test("03 — Verify alert appears in alerts page", async ({ page }) => {
    // Navigate to alerts page
    await page.goto("/alerts", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    // Verify alerts page loaded
    await expect(page.locator(SELECTORS.alerts.heading)).toBeVisible({ timeout: 20000 });

    // Lấy danh sách alerts
    const alertCards = page.locator(SELECTORS.alerts.productCard);
    const alertCount = await alertCards.count();

    // Verify có ít nhất 1 alert (sản phẩm vừa thêm)
    expect(alertCount).toBeGreaterThan(0);

    // Store product name từ alert đầu tiên để verify
    const firstAlertName = await alertCards.first().locator("h2").textContent();
    expect(firstAlertName).toBeTruthy();
  });

  /**
   * Test 04: Delete alert from alerts page
   * - Xóa sản phẩm khỏi alert là pass
   */
  test("04 — Delete alert from alerts page", async ({ page }) => {
    // Navigate to alerts page
    await page.goto("/alerts", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    // Verify alerts page loaded
    await expect(page.locator(SELECTORS.alerts.heading)).toBeVisible({ timeout: 20000 });

    // Get initial alert count
    const alertCards = page.locator(SELECTORS.alerts.productCard);
    const initialCount = await alertCards.count();

    // Verify có alert để xóa
    expect(initialCount).toBeGreaterThan(0);

    // Lấy tên sản phẩm alert đầu tiên
    const firstAlertName = await alertCards.first().locator("h2").textContent();

    // Xóa alert đầu tiên
    await deleteAlertByProductName(page, firstAlertName!);

    // Verify alert đã được xóa
    // Sau khi xóa, số lượng alerts giảm đi 1
    await page.waitForTimeout(1000);
    const newCount = await alertCards.count();
    expect(newCount).toBe(initialCount - 1);

    // Verify sản phẩm đã xóa không còn trong danh sách
    if (newCount > 0) {
      const isStillThere = await isProductInAlerts(page, firstAlertName!);
      expect(isStillThere).toBe(false);
    }
  });
});
