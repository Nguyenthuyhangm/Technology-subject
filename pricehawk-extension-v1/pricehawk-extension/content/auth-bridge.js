// ============================================================
// PriceHawk — Auth Bridge
// Chạy trên Web App domain, đọc Supabase session từ localStorage
// và đồng bộ vào extension (chrome.storage.local via background).
// Supabase JS client lưu session với key: sb-{project-ref}-auth-token
// ============================================================

(function () {
  "use strict";

  function readSupabaseSession() {
    try {
      // Tìm dynamic key theo pattern của Supabase JS v2
      const key = Object.keys(localStorage).find(
        k => k.startsWith("sb-") && k.endsWith("-auth-token")
      );
      if (!key) return null;

      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const session = JSON.parse(raw);
      const { access_token, refresh_token, user } = session;
      if (!access_token || !user?.id) return null;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        userId: user.id,
        email: user.email || "",
      };
    } catch {
      return null;
    }
  }

  function sync() {
    if (!chrome?.runtime?.id) return; // extension đã bị unload
    const auth = readSupabaseSession();
    if (auth) {
      chrome.runtime.sendMessage({ type: "AUTH_SYNC", payload: auth });
    } else {
      chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" });
    }
  }

  // Sync ngay khi content script load (user vừa mở web app)
  sync();

  // Lắng nghe login/logout events từ tab khác
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith("sb-") && e.key.endsWith("-auth-token")) {
      sync();
    }
  });

  // Re-sync khi user quay lại tab — bắt được login cùng tab (storage event không fire)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") sync();
  });
})();
