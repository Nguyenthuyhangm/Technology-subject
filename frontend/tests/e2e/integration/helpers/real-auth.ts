import type { Page } from "@playwright/test";
import { SELECTORS } from "./selectors";

export const TEST_USERS = {
  default: {
    email: "trangdinhhuyen269@gmail.com",
    password: "123456",
  },
} as const;

export async function navigateToLogin(page: Page): Promise<void> {
  await page.goto("/login", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await page.waitForSelector(SELECTORS.auth.emailInput, {
    state: "visible",
    timeout: 30000,
  });
}

export async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.fill(SELECTORS.auth.emailInput, email);
  await page.fill(SELECTORS.auth.passwordInput, password);
}

export async function submitLoginForm(page: Page): Promise<void> {
  await page.click(SELECTORS.auth.submitButton);
}

export async function loginAsUser(
  page: Page,
  email: string,
  password: string,
): Promise<boolean> {
  await navigateToLogin(page);
  await fillLoginForm(page, email, password);
  await submitLoginForm(page);

  try {
    await page.waitForFunction(
      (loginPath) => !window.location.pathname.includes("/login"),
      "/login",
      { timeout: 30000 },
    );

    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    return !currentUrl.includes("/login");
  } catch {
    const errorMsg = await getAuthErrorMessage(page);
    console.log(`[loginAsUser] Login failed. Error message: "${errorMsg}"`);
    return false;
  }
}

export async function loginAsTestUser(page: Page): Promise<boolean> {
  const { email, password } = TEST_USERS.default;
  return loginAsUser(page, email, password);
}

export async function logout(page: Page): Promise<void> {
  const userButton = page.locator(SELECTORS.header.userAvatar);
  const isUserButtonVisible = await userButton.isVisible().catch(() => false);

  if (isUserButtonVisible) {
    await userButton.click();
    await page.waitForTimeout(300);

    const logoutButton = page.locator(SELECTORS.header.logoutButton);
    const isLogoutVisible = await logoutButton.isVisible().catch(() => false);

    if (isLogoutVisible) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    }
  }
}

export async function isUserLoggedIn(page: Page): Promise<boolean> {
  const loginButtonVisible = await page
    .locator(SELECTORS.header.loginButton)
    .isVisible()
    .catch(() => false);

  const avatarVisible = await page
    .locator(SELECTORS.header.userAvatar)
    .isVisible()
    .catch(() => false);

  return avatarVisible && !loginButtonVisible;
}

export async function waitForLoggedInState(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const loginButton = document.querySelector("button");
      if (!loginButton) return true;

      const buttonText = loginButton.textContent || "";
      return !buttonText.includes("Đăng nhập");
    },
    { timeout: 20000 },
  );
}

export async function clearAuthAndNavigate(
  page: Page,
  path = "/",
): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto(path, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
}

export async function waitForAuthPage(page: Page): Promise<void> {
  await page.waitForSelector(SELECTORS.auth.emailInput, {
    state: "visible",
    timeout: 15000,
  });
}

export async function getAuthErrorMessage(page: Page): Promise<string> {
  try {
    const errorLocator = page.locator(SELECTORS.auth.errorMessage);
    await errorLocator.waitFor({ state: "visible", timeout: 5000 });
    return (await errorLocator.textContent()) || "";
  } catch {
    return "";
  }
}
