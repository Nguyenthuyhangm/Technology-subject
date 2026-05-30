import { test, expect } from './fixtures';
import { API_BASE_URL } from './fixtures';

test.describe('Price History API Tests', () => {
  test('01 — GET /api/v1/price-history returns error for invalid UUID', async ({ guestPage }) => {
    const response = await guestPage.context().request.get(`${API_BASE_URL}/api/v1/price-history/invalid-uuid`);

    expect([400, 404, 500]).toContain(response.status());
  });
});
