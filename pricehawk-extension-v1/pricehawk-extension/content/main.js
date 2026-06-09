// ============================================================
// PriceHawk — Content Script Entry Point
// Detect platform → extract → send to background → render UI
// UI rendering is handled by overlay.js (loaded before this file)
// normalizer.js (loaded before this file) cung cấp normalizeName, normalizePrice
// ============================================================

(function () {
  "use strict";

  // ── Platform detection ──────────────────────────────────────
  function detectPlatform(url) {
    if (url.includes("shopee.vn"))       return { platform: "shopee",   mode: "external"  };
    if (url.includes("lazada.vn"))       return { platform: "lazada",   mode: "external"  };
    if (url.includes("tiki.vn"))         return { platform: "tiki",     mode: "in-system" };
    if (url.includes("hasaki.vn"))       return { platform: "hasaki",   mode: "in-system" };
    if (url.includes("watsons.com.vn"))  return { platform: "watsons",  mode: "in-system" };
    if (url.includes("guardian.com.vn")) return { platform: "guardian", mode: "in-system" };
    if (url.includes("cocolux.com"))     return { platform: "cocolux",  mode: "in-system" };
    return null;
  }

  // ── Extractors ──────────────────────────────────────────────
  function extractProductInfo(platform) {
    switch (platform) {
      case "shopee":   return extractShopee();
      case "lazada":   return extractLazada();
      case "tiki":     return extractTiki();
      case "hasaki":   return extractHasaki();
      case "watsons":  return extractWatsons();
      case "guardian": return extractGuardian();
      case "cocolux":  return extractCocolux();
    }
    return null;
  }

  function extractShopee() {
    // Shopee product URL: /product-name-i.shopid.itemid (no slash before -i.)
    if (!location.pathname.match(/-i\.\d+\.\d+/)) return null;
    const nameEl = document.querySelector(".product-briefing__title span")
      || document.querySelector('[class*="product-name"]')
      || document.querySelector("h1");
    const priceEl = document.querySelector(".product-price__current-price")
      || document.querySelector('[class*="price-current"]')
      || document.querySelector('[class*="price"] [class*="current"]')
      || document.querySelector('[class*="product-price"] span');
    const name = nameEl?.innerText?.trim();
    if (!name) return null;
    return { platform: "shopee", mode: "external", name, priceRaw: priceEl?.innerText?.trim(), url: location.href };
  }

  function extractLazada() {
    if (!location.pathname.match(/\.html$|\/products\//)) return null;
    const nameEl = document.querySelector(".pdp-product-title")
      || document.querySelector('[class*="pdp-mod-product-badge-title"]')
      || document.querySelector("h1");
    const priceEl = document.querySelector(".pdp-price.pdp-price_type_normal")
      || document.querySelector('[class*="pdp-price"]')
      || document.querySelector('[class*="price"]');
    const name = nameEl?.innerText?.trim();
    if (!name) return null;
    return { platform: "lazada", mode: "external", name, priceRaw: priceEl?.innerText?.trim(), url: location.href };
  }

  function extractTiki() {
    const pathMatch = location.pathname.match(/p(\d+)\.html/);
    const spid = new URLSearchParams(location.search).get("spid");
    const productId = pathMatch?.[1] || spid;
    if (!productId) return null;
    const nameEl = document.querySelector('[data-view-id="pdp_main_view"] h1')
      || document.querySelector(".header__title h1")
      || document.querySelector("h1");
    const priceEl = document.querySelector(".product-price--current")
      || document.querySelector('[class*="price__current"]')
      || document.querySelector('[class*="price-final"]');
    return { platform: "tiki", mode: "in-system", productId, name: nameEl?.innerText?.trim(), priceRaw: priceEl?.innerText?.trim(), url: location.href };
  }

  function extractHasaki() {
    const pathMatch = location.pathname.match(/-(\d+)\.html$/);
    const productId = pathMatch?.[1];
    if (!productId) return null;
    const nameEl = document.querySelector(".product-name h1")
      || document.querySelector('[class*="product__name"] h1')
      || document.querySelector("h1");
    const priceEl = document.querySelector(".product-price .pro-price")
      || document.querySelector('[class*="price-box"] .price')
      || document.querySelector('[class*="current-price"]');
    return { platform: "hasaki", mode: "in-system", productId, name: nameEl?.innerText?.trim(), priceRaw: priceEl?.innerText?.trim(), url: location.href };
  }

  function extractWatsons() {
    const pathMatch = location.pathname.match(/\/p\/(.+)/);
    const productId = pathMatch?.[1]?.replace(/\/$/, "");
    if (!productId) return null;
    const nameEl = document.querySelector(".product-name")
      || document.querySelector('[class*="ProductName"]')
      || document.querySelector("h1");
    const priceEl = document.querySelector(".product-price")
      || document.querySelector('[class*="Price"]')
      || document.querySelector('[class*="price"]');
    return { platform: "watsons", mode: "in-system", productId, name: nameEl?.innerText?.trim(), priceRaw: priceEl?.innerText?.trim(), url: location.href };
  }

  function extractGuardian() {
    const pathMatch = location.pathname.match(/\/p\/(.+)/);
    const productId = pathMatch?.[1]?.replace(/\/$/, "");
    if (!productId) return null;
    const nameEl = document.querySelector(".product-name")
      || document.querySelector("h1");
    const priceEl = document.querySelector(".price-final")
      || document.querySelector('[class*="price"]');
    return { platform: "guardian", mode: "in-system", productId, name: nameEl?.innerText?.trim(), priceRaw: priceEl?.innerText?.trim(), url: location.href };
  }

  function extractCocolux() {
    // Cocolux product URLs: /{slug}-i.{productId} (e.g. /ten-san-pham-i.8809971480017)
    const pathMatch = location.pathname.match(/-i\.(\d+)\/?$/);
    const productId = pathMatch?.[1];
    if (!productId) return null;
    const nameEl = document.querySelector(".product-detail__name")
      || document.querySelector('[class*="product-name"]')
      || document.querySelector("h1");
    const priceEl = document.querySelector(".product-detail__price")
      || document.querySelector('[class*="price-current"]')
      || document.querySelector('[class*="price"]');
    return { platform: "cocolux", mode: "in-system", productId, name: nameEl?.innerText?.trim(), priceRaw: priceEl?.innerText?.trim(), url: location.href };
  }

  // ── Helpers ─────────────────────────────────────────────────
  function isContextValid() {
    try {
      return !!chrome.runtime?.id;
    } catch (e) {
      return false;
    }
  }

  function resetBadge() {
    const badge = document.getElementById("ph-badge");
    if (badge) { badge.style.display = "none"; badge.textContent = ""; }
  }

  // ── State ────────────────────────────────────────────────────
   let _currentInfo = null;
  let _currentCompareData = null;
  let _currentPriceHistory = null;
  let _searchSeq = 0;
  let _pollingInterval = null;  // setInterval ID cho polling job status
  let _currentJobId = null;     // jobId đang polling

  // ── Message listener ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    const { type, payload } = message;

    if (type === "SEARCH_RESULT") {
      if (payload.seq !== _searchSeq) return;
      const { productId, firstResult, name, currentPrice, platform } = payload;
      _currentInfo = { name: firstResult?.name || name, platform, productId, currentPrice };
      renderCurrentProduct(_currentInfo, currentPrice);
      renderLoading();
      chrome.runtime.sendMessage({
        type: "COMPARE_BY_ID",
        payload: { productId, currentPrice, platform, seq: _searchSeq },
      });
      chrome.runtime.sendMessage({
        type: "GET_PRICE_HISTORY",
        payload: { productId, seq: _searchSeq },
      });
      return;
    }

    if (type === "COMPARE_RESULT") {
      if (payload.seq !== _searchSeq) return;
      const { data, currentPrice, platform, productId } = payload;
      _currentCompareData = { data, currentPrice, platform, productId };
      renderComparison(_currentCompareData, _currentPriceHistory);
      return;
    }

    if (type === "PRICE_HISTORY_RESULT") {
  console.log("[PH] PRICE_HISTORY_RESULT received:", JSON.stringify(payload));
  if (payload.seq !== _searchSeq) {
    console.log("[PH] seq mismatch! payload.seq:", payload.seq, "| _searchSeq:", _searchSeq);
    return;
  }
  const { productId, priceHistory } = payload;
  _currentPriceHistory = { productId, priceHistory };
  renderComparison(_currentCompareData, _currentPriceHistory);
  return;
}

    if (type === "SEARCH_ERROR") {
  if (payload.seq !== _searchSeq) return;
  console.log("[PH] SEARCH_ERROR received:", payload.message); // THÊM
  if (_currentInfo && _currentInfo.name) {
    console.log("[PH] Triggering on-demand for:", _currentInfo.name); // THÊM
    triggerOnDemandFlow();
  } else {
    console.log("[PH] _currentInfo missing, cannot trigger"); // THÊM
    renderError("❌ Lỗi tìm kiếm: " + payload.message);
  }
  return;
}
 
    // Handler: on-demand đã được trigger thành công
    if (type === "ON_DEMAND_TRIGGERED") {
        console.log("[PH] ON_DEMAND_TRIGGERED, jobId:", payload.jobId); // THÊM

      if (payload.seq !== _searchSeq) return;
      _currentJobId = payload.jobId;
      renderOnDemandWaiting(0);
      startPolling(payload.jobId);
      return;
    }
 
    // Handler: nhận status từ polling
    if (type === "CRAWL_JOB_STATUS") {
        console.log("[PH] CRAWL_JOB_STATUS:", payload.jobStatus); // THÊM

      if (payload.seq !== _searchSeq) return;
      handleJobStatus(payload.jobStatus);
      return;
    }
 
    // Handler: on-demand fail ngay lúc trigger (network lỗi, rate limit)
    if (type === "ON_DEMAND_ERROR") {
        console.log("[PH] ON_DEMAND_ERROR:", payload.message); // THÊM

      if (payload.seq !== _searchSeq) return;
      stopPolling();
      if (payload.message === "RATE_LIMITED") {
        renderError("⏳ Bạn đã tìm kiếm quá nhiều lần.<br>Vui lòng thử lại sau 1 giờ.");
      } else {
        renderError("❌ Không thể tìm kiếm tự động.<br>Thử tải lại trang và nhấn lại.");
      }
      return;
    }

    if (type === "COMPARE_ERROR") {
      if (payload.seq !== _searchSeq) return;
      renderError("❌ Lỗi so sánh: " + payload.message);
      return;
    }

    if (type === "PRICE_HISTORY_ERROR") {
      if (payload.seq !== _searchSeq) return;
      console.log("[PriceHawk] Cảnh báo: Không lấy được lịch sử giá", payload.message);
      return;
    }
  });

  // ── Trigger ──────────────────────────────────────────────────
  function triggerCompareFromClick() {
    const detected = detectPlatform(location.href);
    if (!detected) return;

    _currentCompareData = null;
    _currentPriceHistory = null;
    const seq = ++_searchSeq;

    if (!document.getElementById("pricehawk-root")) {
      mountOverlay(triggerCompareFromClick, handleRefresh);
    } else {
      document.getElementById("ph-panel").classList.remove("ph-hidden");
    }
    renderLoading();

    doExtractWithRetry(detected, 0, seq);
  }

  function handleRefresh() {
    if (!isContextValid()) {
      renderError("⚠️ Extension đã được reload.<br>Vui lòng tải lại trang để tiếp tục.");
      return;
    }
    try {
      chrome.storage.local.clear(() => {
        _currentCompareData = null;
        _currentPriceHistory = null;
        triggerCompareFromClick();
      });
    } catch (e) {
      renderError("⚠️ Extension đã được reload.<br>Vui lòng tải lại trang để tiếp tục.");
    }
  }

  // Retry extraction để xử lý SPA render chậm
  // Retry extraction để xử lý SPA render chậm
  function doExtractWithRetry(detected, attempt, seq) {
    if (seq !== _searchSeq) return;

    const info = extractProductInfo(detected.platform);

    if (!info) {
      renderError("👆 Vui lòng mở <b>trang chi tiết sản phẩm</b> để so sánh giá");
      return;
    }

    if (!info.name && attempt < 6) {
      setTimeout(() => doExtractWithRetry(detected, attempt + 1, seq), 400);
      return;
    }

    if (!info.name) {
      renderError("❌ Không đọc được tên sản phẩm.<br>Thử tải lại trang rồi nhấn lại.");
      return;
    }

    _currentInfo = { ...info, ...detected };
    const currentPrice = normalizePrice(info.priceRaw);
    renderCurrentProduct(_currentInfo, currentPrice);

    if (!isContextValid()) {
      renderError("⚠️ Extension đã được reload.<br>Vui lòng tải lại trang để tiếp tục.");
      return;
    }

    try {
      // Sàn in-system → tìm theo URL (chính xác 100%)
      // Sàn external (Shopee/Lazada) → tìm theo tên như cũ
      if (detected.mode === "in-system") {
        chrome.runtime.sendMessage({
          type: "SEARCH_BY_URL",
          payload: {
            url: location.href,
            name: normalizeName(info.name),
            currentPrice,
            platform: detected.platform,
            seq,
          },
        });
      } else {
        chrome.runtime.sendMessage({
          type: "SEARCH_BY_NAME",
          payload: {
            name: normalizeName(info.name),
            currentPrice,
            platform: detected.platform,
            seq,
          },
        });
      }
    } catch (e) {
      renderError("⚠️ Extension đã được reload.<br>Vui lòng tải lại trang để tiếp tục.");
    }
  }

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    const detected = detectPlatform(location.href);
    if (!detected) return;

    mountOverlay(triggerCompareFromClick, handleRefresh);

    // SPA navigation: reset khi URL thay đổi
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        _searchSeq++;       // vô hiệu hoá mọi message cũ
        stopPolling();      // dừng polling nếu đang chạy
        _currentJobId = null;
        _currentInfo = null;
        _currentCompareData = null;
        _currentPriceHistory = null;
        resetBadge();
        const panel = document.getElementById("ph-panel");
        if (panel) panel.classList.add("ph-hidden");
      }
    });
 
    observer.observe(document.body, { childList: true, subtree: true });
  }
  function triggerOnDemandFlow() {
    if (!_currentInfo || !isContextValid()) return;
 
    renderOnDemandWaiting(0); // Hiện UI chờ ngay
 
    try {
      chrome.runtime.sendMessage({
        type: "TRIGGER_ON_DEMAND",
        payload: {
          productName:    _currentInfo.name,
          sourceUrl:      _currentInfo.url || location.href,
          sourcePlatform: _currentInfo.platform,
          seq:            _searchSeq,
        },
      });
    } catch (e) {
      renderError("⚠️ Extension đã được reload.<br>Vui lòng tải lại trang để tiếp tục.");
    }
  }
 
  /**
   * Bắt đầu polling job status mỗi 5 giây.
   * Tự dừng sau 3 phút nếu không xong.
   */
  function startPolling(jobId) {
    stopPolling(); // Dọn interval cũ nếu có
 
    _pollingInterval = setInterval(() => {
      if (!isContextValid()) { stopPolling(); return; }
      try {
        chrome.runtime.sendMessage({
          type: "POLL_CRAWL_JOB",
          payload: { jobId, seq: _searchSeq },
        });
      } catch (e) {
        stopPolling();
      }
    }, 5000); // Poll mỗi 5 giây
 
    // Timeout tổng 3 phút — dừng và báo lỗi
    setTimeout(() => {
      if (_pollingInterval) {
        stopPolling();
        renderError("⏳ Tìm kiếm quá lâu.<br>Vui lòng thử lại sau.");
      }
    }, 180_000);
  }
 
  /** Dừng polling interval, giải phóng resource. */
  function stopPolling() {
    if (_pollingInterval) {
      clearInterval(_pollingInterval);
      _pollingInterval = null;
    }
  }
 
  /**
   * Xử lý job status từ polling.
   * - DONE     → load kết quả so sánh ngay
   * - FAILED   → hiện lỗi
   * - RUNNING  → cập nhật text "Đã tìm thấy X sàn"
   */
  function handleJobStatus(jobStatus) {
    if (!jobStatus) return; // Poll fail hoặc job hết TTL — bỏ qua lần này
 
    if (jobStatus.status === "DONE" && jobStatus.productId) {
      stopPolling();
      // Tự động load so sánh — dùng lại flow bình thường
      chrome.runtime.sendMessage({
        type: "COMPARE_BY_ID",
        payload: {
          productId:    jobStatus.productId,
          currentPrice: _currentInfo?.currentPrice || null,
          platform:     _currentInfo?.platform || null,
          seq:          _searchSeq,
        },
      });
      chrome.runtime.sendMessage({
        type: "GET_PRICE_HISTORY",
        payload: { productId: jobStatus.productId, seq: _searchSeq },
      });
      return;
    }
 
    if (jobStatus.status === "FAILED") {
      stopPolling();
      const msg = jobStatus.errorMessage || "Thử tìm lại với tên khác.";
      renderError("❌ Không tìm được sản phẩm này trên các sàn.<br>" +
                  "<small style='color:#999'>" + msg + "</small>");
      return;
    }
 
    // PENDING hoặc RUNNING → update UI chờ
    renderOnDemandWaiting(jobStatus.platformsFound || 0);
  }
 
  /**
   * Hiện UI trạng thái đang tìm kiếm trong ph-body.
   * @param {number} platformsFound - số sàn đã có kết quả (0 khi mới bắt đầu)
   */
  function renderOnDemandWaiting(platformsFound) {
    const body = document.getElementById("ph-body");
    if (!body) return;
 
    const foundText = platformsFound > 0
      ? `<div class="ph-on-demand-found">✅ Đã tìm thấy trên ${platformsFound} sàn...</div>`
      : "";
 
    body.innerHTML = `
      <div class="ph-loading">
        <div class="ph-spinner"></div>
        <div class="ph-loading-text">🔍 Đang tìm kiếm trên các sàn...</div>
        <div class="ph-on-demand-sub">
          Lần đầu tìm kiếm sản phẩm này có thể mất 30–60 giây
        </div>
        ${foundText}
      </div>`;
  }

  init();
})();
