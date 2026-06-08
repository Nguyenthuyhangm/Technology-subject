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
async function triggerOnDemandCrawl(productName, sourceUrl, sourcePlatform, accessToken) {
  // Tăng timeout lên 25s — backend cần thời gian khởi động async job
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 60000); // 25s thay vì 10s
  
  try {
    const headers = { "Content-Type": "application/json;charset=UTF-8" };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    const res = await fetch(`${CONFIG.BACKEND_URL}/api/crawl/on-demand`, {
      method: "POST",
      headers,
      body: JSON.stringify({ productName, sourceUrl, sourcePlatform }),
      signal: controller.signal
    });

    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Bad request");
    }
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}
 
/**
 * Đọc trạng thái job crawl (dùng cho polling mỗi 5 giây).
 * Endpoint: GET /api/crawl/jobs/{jobId}
 *
 * @param {string} jobId - UUID string từ triggerOnDemandCrawl()
 * @returns {OnDemandCrawlJobDTO|null} null nếu job không tồn tại / hết TTL
 *
 * Shape của return value khi status="DONE":
 * {
 *   jobId, status: "DONE", productId: "uuid",
 *   platformsFound: 4, finishedAt: "ISO string"
 * }
 *
 * Shape khi status="RUNNING":
 * {
 *   jobId, status: "RUNNING", productId: null,
 *   platformsFound: 2, triggeredAt: "ISO string"
 * }
 */
async function pollCrawlJob(jobId) {
  const res = await fetchWithTimeout(
    `${CONFIG.BACKEND_URL}/api/crawl/jobs/${jobId}`,
    { headers: { "Accept": "application/json" } }
  );
 
  if (res.status === 404) return null; // Job hết hạn hoặc không tồn tại
  if (!res.ok) throw new Error(`API error ${res.status}`);
 
  return await res.json();
}