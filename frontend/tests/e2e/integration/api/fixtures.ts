import { test as base, expect, Page } from '@playwright/test';
import { TEST_USERS } from '../helpers/real-auth';

export { expect };

export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const WEB_BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export const test = base.extend<{
  authenticatedPage: Page;
  guestPage: Page;
}>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      locale: 'vi-VI',
      timezoneId: 'Asia/Ho_Chi_Minh',
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    await page.goto(`${WEB_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="email"]', TEST_USERS.default.email);
    await page.fill('input[name="password"]', TEST_USERS.default.password);
    await page.click('button[type="submit"]');

    try {
      await page.waitForFunction(
        () => !window.location.pathname.includes('/login'),
        undefined,
        { timeout: 30000 }
      );
      console.log('Login successful');
    } catch {
      console.log('Login may have failed, but continuing anyway');
    }

    await page.waitForTimeout(2000);

    await use(page);
    await context.close();
  },

  guestPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

test.describe.configure({ mode: 'serial' });

export async function apiGet(page: Page, endpoint: string): Promise<{ status: number; body: any }> {
  return await page.evaluate(async ({ url }) => {
    const apiBaseUrl = (window as any).__API_BASE_URL__ || 'http://localhost:8080';
    const fullUrl = url.startsWith('http') ? url : apiBaseUrl + url;
    
    const response = await fetch(fullUrl, {
      credentials: 'include'
    });
    
    return {
      status: response.status,
      body: await response.json().catch(() => null)
    };
  }, { url: endpoint });
}
