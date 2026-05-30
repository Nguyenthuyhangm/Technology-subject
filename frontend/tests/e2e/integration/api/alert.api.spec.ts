import { test, expect, Page } from './fixtures';
import { API_BASE_URL } from './fixtures';

async function getSupabaseToken(page: Page): Promise<string | null> {
  return await page.evaluate(async () => {
    // Try to get from window.supabase if available
    if ((window as any).supabase) {
      const { data } = await (window as any).supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    }
    
    // Try to get from localStorage
    // Supabase stores session in localStorage with key pattern
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
        } catch (e) {
          // ignore parse errors
        }
      }
    }
    
    return null;
  });
}

async function apiGet(page: Page, endpoint: string, requireAuth = false): Promise<{ status: number; body: any }> {
  return await page.evaluate(async ({ ep, auth }) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (auth) {
      headers['Authorization'] = `Bearer ${auth}`;
    }
    
    const response = await fetch(ep, {
      headers,
      credentials: 'include'
    });
    
    return {
      status: response.status,
      body: await response.json().catch(() => null)
    };
  }, { ep: `${API_BASE_URL}${endpoint}`, auth: requireAuth ? await getSupabaseToken(page) : null });
}

export { apiGet, getSupabaseToken };

test.describe('Alert API Tests', () => {
  test('01 — GET /api/alerts returns user alerts', async ({ authenticatedPage }) => {
    const result = await apiGet(authenticatedPage, '/api/alerts', true);

    expect(result.status).toBe(200);
    expect(Array.isArray(result.body)).toBe(true);
  });

  test('02 — Alert response contains required fields', async ({ authenticatedPage }) => {
    const result = await apiGet(authenticatedPage, '/api/alerts', true);

    expect(result.status).toBe(200);
    const body = result.body;

    if (body.length > 0) {
      const alert = body[0];
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('productId');
      expect(alert).toHaveProperty('targetPrice');
      expect(alert).toHaveProperty('active');
    }
  });

  test('03 — GET /api/notifications returns notifications', async ({ authenticatedPage }) => {
    const result = await apiGet(authenticatedPage, '/api/notifications', true);

    expect(result.status).toBe(200);
    expect(Array.isArray(result.body)).toBe(true);
  });

  test('04 — GET /api/notifications/unread-count returns count', async ({ authenticatedPage }) => {
    const result = await apiGet(authenticatedPage, '/api/notifications/unread-count', true);

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('count');
    expect(typeof result.body.count).toBe('number');
  });
});
