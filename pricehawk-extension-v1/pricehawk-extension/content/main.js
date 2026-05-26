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
      if (payload.seq !== _searchSeq) return;
      const { productId, priceHistory } = payload;
      _currentPriceHistory = { productId, priceHistory };
      renderComparison(_currentCompareData, _currentPriceHistory);
      return;
    }

    if (type === "SEARCH_ERROR") {
      if (payload.seq !== _searchSeq) return;
      renderError("❌ Lỗi tìm kiếm: " + payload.message);
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
  function doExtractWithRetry(detected, attempt, seq) {
    if (seq !== _searchSeq) return; // bị huỷ bởi navigation mới

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
      chrome.runtime.sendMessage({
        type: "SEARCH_BY_NAME",
        payload: { name: normalizeName(info.name), currentPrice, platform: detected.platform, seq },
      });
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
        _searchSeq++; // vô hiệu hoá mọi request đang bay
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

  init();
})();
