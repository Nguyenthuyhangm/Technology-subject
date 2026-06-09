// ============================================================
// PriceHawk — Background Service Worker (MV3)
// Nhận message từ content scripts, gọi API, trả kết quả
// ============================================================

importScripts("../config.js", "api.js", "cache.js", "auth.js");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  // ── AUTH_SYNC ──
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

  // ── GET_AUTH_STATE ──
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

  // ── Tab-specific messages ──
  const tabId = sender.tab?.id;
  if (!tabId) return false;

  // ── SEARCH_BY_URL — dùng cho sàn in-system (Tiki/Hasaki/Watsons/Guardian/Cocolux) ──
  // Tìm product theo URL listing → chính xác 100%, không bị nhầm như search tên
  if (type === "SEARCH_BY_URL") {
    (async () => {
      try {
        const cacheKey = `search_url_${payload.url.substring(0, 80)}`;
        let result = await cacheGet(cacheKey);

        if (!result) {
          // Gọi endpoint mới: GET /api/products/by-url?url=...
          const encoded = encodeURIComponent(payload.url);
          const resp = await fetch(
           `${CONFIG.BACKEND_URL}/api/products/by-url?url=${encoded}`,
            { headers: { "Content-Type": "application/json" } }
          );

          if (resp.status === 404) {
            // Không tìm thấy trong DB → trigger on-demand
            throw new Error("NOT_FOUND");
          }

          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }

          result = await resp.json(); // { productId, productName }
          await cacheSet(cacheKey, result);
        }

        console.log("[PH] by-url found:", result.productId, result.productName);

        chrome.tabs.sendMessage(tabId, {
          type: "SEARCH_RESULT",
          payload: {
            productId: result.productId,
            firstResult: { name: result.productName },
            name: payload.name,
            currentPrice: payload.currentPrice,
            platform: payload.platform,
            seq: payload.seq,
          },
        });
      } catch (err) {
        // NOT_FOUND hoặc lỗi khác → fallback sang SEARCH_ERROR để trigger on-demand
        chrome.tabs.sendMessage(tabId, {
          type: "SEARCH_ERROR",
          payload: { message: err.message, seq: payload.seq },
        });
      }
    })();
    return false;
  }

  // ── SEARCH_BY_NAME — dùng cho sàn external (Shopee/Lazada) ──
  if (type === "SEARCH_BY_NAME") {
    (async () => {
      try {
        const cacheKey = `search_name_${payload.name.substring(0, 40)}`;
        let searchResult = await cacheGet(cacheKey);
        console.log("[PH] Cache hit:", !!searchResult, "| name:", payload.name);
        if (!searchResult) {
          searchResult = await searchAndGetProductId(payload.name);
          console.log("[PH] Search result:", JSON.stringify(searchResult));
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
        chrome.tabs.sendMessage(tabId, {
          type: "SEARCH_ERROR",
          payload: { message: err.message, seq: payload.seq },
        });
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
        chrome.tabs.sendMessage(tabId, {
          type: "COMPARE_ERROR",
          payload: { message: err.message, seq: payload.seq },
        });
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
        payload: {
          productId: payload.productId,
          priceHistory: data,   // = { productId, platforms: [...] }
          seq: payload.seq,
        },
      });
    } catch (err) {
      chrome.tabs.sendMessage(tabId, {
        type: "PRICE_HISTORY_ERROR",
        payload: { message: err.message, seq: payload.seq },
      });
    }
  })();
  return false;
}

  // ── TRIGGER_ON_DEMAND ──
  if (type === "TRIGGER_ON_DEMAND") {
    (async () => {
      try {
        const auth = await getValidAuthState();
        const result = await triggerOnDemandCrawl(
          payload.productName,
          payload.sourceUrl,
          payload.sourcePlatform,
          auth?.accessToken || null
        );
        chrome.tabs.sendMessage(tabId, {
          type: "ON_DEMAND_TRIGGERED",
          payload: { jobId: result.jobId, seq: payload.seq },
        });
      } catch (err) {
        chrome.tabs.sendMessage(tabId, {
          type: "ON_DEMAND_ERROR",
          payload: { message: err.message, seq: payload.seq },
        });
      }
    })();
    return false;
  }

  // ── POLL_CRAWL_JOB ──
  if (type === "POLL_CRAWL_JOB") {
    (async () => {
      try {
        const jobStatus = await pollCrawlJob(payload.jobId);
        chrome.tabs.sendMessage(tabId, {
          type: "CRAWL_JOB_STATUS",
          payload: { jobStatus, seq: payload.seq },
        });
      } catch (err) {
        console.warn("[PriceHawk] Poll error:", err.message);
        chrome.tabs.sendMessage(tabId, {
          type: "CRAWL_JOB_STATUS",
          payload: { jobStatus: null, seq: payload.seq },
        });
      }
    })();
    return false;
  }

});