// ============================================================
// PriceHawk Extension — Config
// Thay BACKEND_URL bằng URL thực của backend khi deploy
// ============================================================

const CONFIG = {
  BACKEND_URL: "http://localhost:8080",
  WEB_APP_URL: "http://localhost:5173",   // URL Web App — thay đổi khi deploy
  CACHE_TTL_MS: 10 * 60 * 1000,          // 10 phút
  SEARCH_DEBOUNCE_MS: 800,
};
