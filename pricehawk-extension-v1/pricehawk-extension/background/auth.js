// ============================================================
// PriceHawk — Auth State Management
// Lưu/đọc Supabase session trong chrome.storage.local
// Key: "ph_auth" → { accessToken, refreshToken, userId, email }
// ============================================================

async function getAuthState() {
  return new Promise(resolve =>
    chrome.storage.local.get("ph_auth", data => resolve(data.ph_auth || null))
  );
}

async function setAuthState(auth) {
  return new Promise(resolve =>
    chrome.storage.local.set({ ph_auth: auth }, resolve)
  );
}

async function clearAuthState() {
  return new Promise(resolve =>
    chrome.storage.local.remove("ph_auth", resolve)
  );
}

// Trả về auth nếu còn hạn, null nếu hết hạn hoặc chưa đăng nhập
async function getValidAuthState() {
  const auth = await getAuthState();
  if (!auth?.accessToken) return null;
  try {
    // JWT dùng base64url (- và _), cần convert sang base64 thường trước khi atob()
    const b64 = auth.accessToken.split(".")[1]
      .replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, "=");
    const payload = JSON.parse(atob(padded));
    if (payload.exp * 1000 < Date.now()) {
      await clearAuthState();
      return null;
    }
  } catch {
    return null;
  }
  return auth;
}
