// ============================================================
// Simple cache dùng chrome.storage.local
// TTL: 10 phút
// ============================================================

const CACHE_TTL = 10 * 60 * 1000;

async function cacheGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (data) => {
      const entry = data[key];
      if (!entry) return resolve(null);
      if (Date.now() - entry.ts > CACHE_TTL) {
        chrome.storage.local.remove(key);
        return resolve(null);
      }
      resolve(entry.value);
    });
  });
}

async function cacheSet(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: { value, ts: Date.now() } }, resolve);
  });
}
