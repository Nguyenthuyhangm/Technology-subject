// ============================================================
// PriceHawk — Background Service Worker (MV3)
// Nhận message từ content scripts, gọi API, trả kết quả
// ============================================================

importScripts("../config.js", "api.js", "cache.js", "auth.js");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  // ── AUTH_SYNC — nhận session từ auth-bridge.js (web app) ──
  if (type === "AUTH_SYNC") {
    (async () => {
      await setAuthState(payload);
      sendResponse({ success: true });
    })();
    return true;
  }

  // ── AUTH_LOGOUT ──
  if (type === "AUTH_LOGOUT") {
    (async () => {
      await clearAuthState();
      sendResponse({ success: true });
    })();
    return true;
  }

  // ── GET_AUTH_STATE — popup & overlay hỏi trạng thái đăng nhập ──
  if (type === "GET_AUTH_STATE") {
    (async () => {
      const auth = await getValidAuthState();
      sendResponse({ auth });
    })();
    return true;
  }

  // ── ADD_WISHLIST ──
  if (type === "ADD_WISHLIST") {
    (async () => {
      try {
        const auth = await getValidAuthState();
        if (!auth) { sendResponse({ success: false, error: "NOT_LOGGED_IN" }); return; }
        const result = await addToWishlist(auth.userId, payload.productId, auth.accessToken);
        sendResponse({ success: true, data: result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // ── ADD_PRICE_ALERT ──
  if (type === "ADD_PRICE_ALERT") {
    (async () => {
      try {
        const auth = await getValidAuthState();
        if (!auth) { sendResponse({ success: false, error: "NOT_LOGGED_IN" }); return; }
        const result = await createPriceAlert(
          payload.productId,
          payload.targetPrice,
          payload.platformId || null,
          auth.accessToken
        );
        sendResponse({ success: true, data: result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // ── Tab-specific messages (content scripts trên e-commerce) ──
  const tabId = sender.tab?.id;
  if (!tabId) return false;

  // ── SEARCH_BY_NAME ──
  if (type === "SEARCH_BY_NAME") {
    (async () => {
      try {
        const cacheKey = `search_name_${payload.name.substring(0, 40)}`;
        let searchResult = await cacheGet(cacheKey);
        if (!searchResult) {
          searchResult = await searchAndGetProductId(payload.name);
          await cacheSet(cacheKey, searchResult);
        }
        chrome.tabs.sendMessage(tabId, {
          type: "SEARCH_RESULT",
          payload: {
            productId: searchResult.productId,
            firstResult: searchResult.firstResult,
            name: payload.name,
            currentPrice: payload.currentPrice,
            platform: payload.platform,
            seq: payload.seq,
          },
        });
      } catch (err) {
        chrome.tabs.sendMessage(tabId, { type: "SEARCH_ERROR", payload: { message: err.message, seq: payload.seq } });
      }
    })();
    return false;
  }

  // ── COMPARE_BY_ID ──
  if (type === "COMPARE_BY_ID") {
    (async () => {
      try {
        const cacheKey = `compare_id_${payload.productId}`;
        let data = await cacheGet(cacheKey);
        if (!data) {
          data = await compareById(payload.productId);
          await cacheSet(cacheKey, data);
        }
        chrome.tabs.sendMessage(tabId, {
          type: "COMPARE_RESULT",
          payload: {
            mode: "unified",
            data,
            currentPrice: payload.currentPrice,
            platform: payload.platform,
            productId: payload.productId,
            seq: payload.seq,
          },
        });
      } catch (err) {
        chrome.tabs.sendMessage(tabId, { type: "COMPARE_ERROR", payload: { message: err.message, seq: payload.seq } });
      }
    })();
    return false;
  }

  // ── GET_PRICE_HISTORY ──
  if (type === "GET_PRICE_HISTORY") {
    (async () => {
      try {
        const cacheKey = `price_history_${payload.productId}`;
        let data = await cacheGet(cacheKey);
        if (!data) {
          data = await getPriceHistory(payload.productId);
          if (data) await cacheSet(cacheKey, data);
        }
        chrome.tabs.sendMessage(tabId, {
          type: "PRICE_HISTORY_RESULT",
          payload: { productId: payload.productId, priceHistory: data, seq: payload.seq },
        });
      } catch (err) {
        chrome.tabs.sendMessage(tabId, { type: "PRICE_HISTORY_ERROR", payload: { message: err.message, seq: payload.seq } });
      }
    })();
    return false;
  }
});
