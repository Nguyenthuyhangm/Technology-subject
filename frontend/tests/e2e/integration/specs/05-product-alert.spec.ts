import { test, expect, Page } from "@playwright/test";
import { loginAsUser, TEST_USERS } from "../helpers/real-auth";
import { SELECTORS } from "../helpers/selectors";

const VALID_USER = TEST_USERS.default;

async function getProductName(page: Page): Promise<string> {
  const heading = page.locator("h1").first();
  await expect(heading).toBeVisible({ timeout: 10000 });
  return await heading.textContent() ?? "";
}

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

      const confirmButton = page.locator(SELECTORS.alerts.confirmDeleteButton);
      await expect(confirmButton).toBeVisible({ timeout: 5000 });
      await confirmButton.click();
      await page.waitForTimeout(2000);
    }
  }
}

async function fillAlertFormAndCreate(page: Page, targetPrice: string): Promise<string> {
  const alertButton = page.locator(SELECTORS.productDetail.alertButton);
  await alertButton.scrollIntoViewIfNeeded();
  await expect(alertButton).toBeVisible({ timeout: 10000 });
  await alertButton.click();

  const modal = page.locator(SELECTORS.alertModal.modalTitle);
  await expect(modal).toBeVisible({ timeout: 5000 });

  const productName = await getProductName(page);

  const priceInput = page.locator(SELECTORS.alertModal.targetPriceInput);
  await priceInput.scrollIntoViewIfNeeded();
  await priceInput.fill(targetPrice);
  await page.waitForTimeout(500);

  const createButton = page.locator(SELECTORS.alertModal.createAlertButton);
  await expect(createButton).toBeVisible({ timeout: 5000 });
  await createButton.click();

  const successMessage = page.locator(SELECTORS.alertModal.successMessage);
  await expect(successMessage).toBeVisible({ timeout: 10000 });

  const doneButton = page.locator(SELECTORS.alertModal.doneButton);
  await expect(doneButton).toBeVisible({ timeout: 5000 });
  await doneButton.click();
  await page.waitForTimeout(1000);

  return productName;
}

async function isProductInAlerts(page: Page, productName: string): Promise<boolean> {
  try {
    const alertCard = page.locator(SELECTORS.alerts.productCard).filter({ hasText: productName });
    return await alertCard.isVisible({ timeout: 3000 });
  } catch {
    return false;
  }
}

async function deleteAlertByProductName(page: Page, productName: string): Promise<void> {
  const alertCard = page.locator(SELECTORS.alerts.productCard).filter({ hasText: productName });
  await expect(alertCard).toBeVisible({ timeout: 10000 });

  const deleteButton = alertCard.locator(SELECTORS.alerts.deleteButton);
  await deleteButton.scrollIntoViewIfNeeded();
  await deleteButton.click();

  const confirmButton = page.locator(SELECTORS.alerts.confirmDeleteButton);
  await expect(confirmButton).toBeVisible({ timeout: 5000 });
  await confirmButton.click();
  await page.waitForTimeout(2000);
}

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

  test("01 — Clear existing alerts", async ({ page }) => {
    await clearAllAlerts(page);
    const emptyState = page.locator(SELECTORS.alerts.emptyState);
    await expect(emptyState).toBeVisible({ timeout: 5000 });
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

  test("02 — Search kem and set alert on first product", async ({ page }) => {
    await page.goto("/search?q=kem", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    const firstProductLink = page.locator(SELECTORS.search.productDetailLink).first();
    await expect(firstProductLink).toBeVisible({ timeout: 20000 });
    await firstProductLink.click();

    await page.waitForTimeout(10000);

    await expect(page).toHaveURL(/\/product\//);

    const productName = await fillAlertFormAndCreate(page, "50000");

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

  test("03 — Verify alert appears in alerts page", async ({ page }) => {
    await page.goto("/alerts", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    await expect(page.locator(SELECTORS.alerts.heading)).toBeVisible({ timeout: 20000 });

    const alertCards = page.locator(SELECTORS.alerts.productCard);
    const alertCount = await alertCards.count();

    expect(alertCount).toBeGreaterThan(0);

    const firstAlertName = await alertCards.first().locator("h2").textContent();
    expect(firstAlertName).toBeTruthy();
  });

  test("04 — Delete alert from alerts page", async ({ page }) => {
    await page.goto("/alerts", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    await expect(page.locator(SELECTORS.alerts.heading)).toBeVisible({ timeout: 20000 });

    const alertCards = page.locator(SELECTORS.alerts.productCard);
    const initialCount = await alertCards.count();

    expect(initialCount).toBeGreaterThan(0);

    const firstAlertName = await alertCards.first().locator("h2").textContent();

    await deleteAlertByProductName(page, firstAlertName!);

    await page.waitForTimeout(1000);
    const newCount = await alertCards.count();
    expect(newCount).toBe(initialCount - 1);

    if (newCount > 0) {
      const isStillThere = await isProductInAlerts(page, firstAlertName!);
      expect(isStillThere).toBe(false);
    }
  });
});
