import { test, expect } from './fixtures';
import { API_BASE_URL } from './fixtures';

const SEARCH_KEYWORD = 'kem';

test.describe('Search API Tests', () => {
  test('01 — GET /products/search returns results for valid keyword', async ({ guestPage }) => {
    const response = await guestPage.context().request.get(`${API_BASE_URL}/products/search`, {
      params: { q: SEARCH_KEYWORD },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('02 — GET /products/search returns empty for empty keyword', async ({ guestPage }) => {
    const response = await guestPage.context().request.get(`${API_BASE_URL}/products/search`, {
      params: { q: '' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  test('03 — Search response contains required product fields', async ({ guestPage }) => {
    const response = await guestPage.context().request.get(`${API_BASE_URL}/products/search`, {
      params: { q: SEARCH_KEYWORD },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    if (body.length > 0) {
      const product = body[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('bestPrice');
      expect(product).toHaveProperty('imageUrl');
    }
  });
});
