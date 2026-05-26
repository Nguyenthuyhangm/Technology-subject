// ============================================================
// PriceHawk — API Layer (Background Worker)
// Gọi backend Spring Boot
// CONFIG.BACKEND_URL được load từ config.js (importScripts)
// ============================================================

const FETCH_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * So sánh giá theo productId (in-system: Tiki, Hasaki, Watsons, Guardian, Cocolux)
 * Endpoint: GET /api/compare/{productId}
 */
async function compareById(productId) {
  const url = `${CONFIG.BACKEND_URL}/api/compare/${productId}`;
  const res = await fetchWithTimeout(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return await res.json();
}

/**
 * Tìm kiếm sản phẩm theo tên (external: Shopee, Lazada)
 * Endpoint: GET /products/search?q={keyword}
 */
async function searchByName(keyword) {
  const encoded = encodeURIComponent(keyword);
  const url = `${CONFIG.BACKEND_URL}/products/search?q=${encoded}`;
  const res = await fetchWithTimeout(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return await res.json();
}

/**
 * Lấy lịch sử giá
 * Endpoint: GET /api/v1/price-history/{productId}
 */
async function getPriceHistory(productId) {
  const url = `${CONFIG.BACKEND_URL}/api/v1/price-history/${productId}`;
  const res = await fetchWithTimeout(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) return null;
  return await res.json();
}

/**
 * Thêm sản phẩm vào wishlist
 * Endpoint: POST /api/wishlist/add
 */
async function addToWishlist(userId, productId, accessToken) {
  const res = await fetchWithTimeout(`${CONFIG.BACKEND_URL}/api/wishlist/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ userId, productId }),
  });
  if (res.status === 409) throw new Error("ALREADY_EXISTS");
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return await res.json();
}

/**
 * Tạo price alert
 * Endpoint: POST /api/alerts
 */
async function createPriceAlert(productId, targetPrice, platformId, accessToken) {
  const res = await fetchWithTimeout(`${CONFIG.BACKEND_URL}/api/alerts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ productId, targetPrice, platformId: platformId || null, channel: "EMAIL" }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return await res.json();
}

/**
 * Tìm kiếm sản phẩm theo tên và lấy productId từ kết quả đầu tiên
 * Dùng cho cả sàn trong và ngoài (unified approach)
 * Endpoint: GET /products/search?q={keyword}
 */
async function searchAndGetProductId(keyword) {
  const encoded = encodeURIComponent(keyword);
  const url = `${CONFIG.BACKEND_URL}/products/search?q=${encoded}`;
  const res = await fetchWithTimeout(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();

  const items = Array.isArray(data) ? data : (data?.content || data?.results || data?.data || []);
  if (items.length === 0) throw new Error("Không tìm thấy sản phẩm");

  const firstItem = items[0];
  const productId = firstItem?.id || firstItem?.productId || firstItem?.pid;
  if (!productId) throw new Error("Không lấy được productId từ kết quả tìm kiếm");

  return { productId, firstResult: firstItem };
}
