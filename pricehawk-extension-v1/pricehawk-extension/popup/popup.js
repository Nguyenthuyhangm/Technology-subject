const SUPPORTED = ["shopee.vn", "lazada.vn", "tiki.vn", "hasaki.vn", "watsons.com.vn", "guardian.com.vn", "cocolux.com"];

// ── Tab status ──
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || "";
  const isSupported = SUPPORTED.some(s => url.includes(s));
  const dot  = document.getElementById("status-dot");
  const text = document.getElementById("status-text");

  if (isSupported) {
    dot.classList.remove("inactive");
    text.textContent = "Đang hoạt động trên trang này ✓";
  } else {
    text.textContent = "Mở trang sản phẩm để bắt đầu";
  }
});

// ── Auth status ──
chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (response) => {
  const auth = response?.auth;
  const section = document.getElementById("auth-section");
  if (!section) return;

  if (auth?.email) {
    section.innerHTML = `
      <div class="auth-logged-in">
        <div class="auth-avatar">👤</div>
        <div>
          <div class="auth-email" title="${auth.email}">${auth.email}</div>
          <div class="auth-status-ok">Đã đăng nhập ✓</div>
        </div>
      </div>`;
  } else {
    section.innerHTML = `
      <div class="auth-logged-out">
        <span>🔐 Chưa đăng nhập</span>
        <a href="${CONFIG.WEB_APP_URL}/login" target="_blank" rel="noopener" class="auth-login-btn">Đăng nhập →</a>
      </div>`;
  }
});
