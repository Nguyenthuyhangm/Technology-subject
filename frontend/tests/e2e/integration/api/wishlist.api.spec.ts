import { test, expect, Page } from './fixtures';
import { API_BASE_URL } from './fixtures';

async function getSupabaseToken(page: Page): Promise<string | null> {
  return await page.evaluate(async () => {
    if ((window as any).supabase) {
      const { data } = await (window as any).supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    }
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed?.access_token) return parsed.access_token;
            if (parsed?.token) return parsed.token;
            if (parsed?.session?.access_token) return parsed.session.access_token;
          }
        } catch (e) {}
      }
    }
    
    return null;
  });
}

async function apiGet(page: Page, endpoint: string, requireAuth = false): Promise<{ status: number; body: any }> {
  return await page.evaluate(async ({ ep, auth }) => {
    const headers = { 'Content-Type': 'application/json' };
    
    if (auth) {
      headers['Authorization'] = `Bearer ${auth}`;
    }
    
    const response = await fetch(ep, { headers, credentials: 'include' });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { ep: `${API_BASE_URL}${endpoint}`, auth: requireAuth ? await getSupabaseToken(page) : null });
}

test.describe('Wishlist API Tests', () => {
  let userId: string;

  test.beforeEach(async ({ authenticatedPage }) => {
    const result = await apiGet(authenticatedPage, '/users/me', true);
    
    expect(result.status).toBe(200);
    userId = result.body.id;
  });

  test('01 — GET /api/wishlist/{userId} returns user wishlist', async ({ authenticatedPage }) => {
    const result = await apiGet(authenticatedPage, `/api/wishlist/${userId}`, true);

    expect(result.status).toBe(200);
    expect(Array.isArray(result.body)).toBe(true);
  });

  test('02 — GET /api/wishlist/{userId} returns 400 for invalid UUID', async ({ authenticatedPage }) => {
    const result = await apiGet(authenticatedPage, '/api/wishlist/invalid-uuid', true);

    expect(result.status).toBe(400);
    expect(result.body).toHaveProperty('message');
  });
});
