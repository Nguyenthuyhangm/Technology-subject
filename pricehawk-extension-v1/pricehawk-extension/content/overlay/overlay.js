// ============================================================
// PriceHawk — Overlay UI (Refined Sakura Minimalism)
// Fix: contrast rõ, components đồng bộ, spacing thoáng
// ============================================================

const PLATFORM_META = {
  shopee:   { label:"Shopee",   bg:"#fafafa", color:"#6b7280", initial:"S" },
  lazada:   { label:"Lazada",   bg:"#fafafa", color:"#6b7280", initial:"L" },
  tiki:     { label:"Tiki",     bg:"#fafafa", color:"#6b7280", initial:"T" },
  hasaki:   { label:"Hasaki",   bg:"#fafafa", color:"#6b7280", initial:"H" },
  watsons:  { label:"Watsons",  bg:"#fafafa", color:"#6b7280", initial:"W" },
  guardian: { label:"Guardian", bg:"#fafafa", color:"#6b7280", initial:"G" },
  cocolux:  { label:"Cocolux",  bg:"#fafafa", color:"#6b7280", initial:"C" }
};

// Màu biểu đồ: dùng hệ màu đã được làm dịu để nét vẽ không bị "cứng" và "gắt"
const CHART_COLORS = {
  shopee:   "#e65c40",
  lazada:   "#5c6cd6",
  tiki:     "#388be0",
  hasaki:   "#45966d",
  watsons:  "#178ab3",
  guardian: "#d64545",
  cocolux:  "#c24e9c",
  default:  "#9e8787", // Xám taupe ấm, không bị đen/chìm như màu cũ
};

function formatPrice(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("vi-VN") + "₫";
}

function formatKPrice(n) {
  if (!n && n !== 0) return "";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "tr";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(Math.round(n));
}

function priceDiff(current, compare) {
  if (!current || !compare) return null;
  const diff = compare - current;
  const pct = Math.round((diff / current) * 100);
  return { diff, pct };
}

// ── Icons (Minimalist SVGs) ──────────────────────────────────
const ICON_HEART = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const ICON_BELL  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
const ICON_REFRESH = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
const ICON_SEARCH = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8b0b0" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

// ── CSS inject ───────────────────────────────────────────────
// Inject style riêng 1 lần duy nhất để tránh inline style lẫn lộn
function injectStyles() {
  if (document.getElementById("ph-styles")) return;
  const s = document.createElement("style");
  s.id = "ph-styles";
  s.textContent = `
    /* ── Reset & panel shell ── */
    #pricehawk-root * { box-sizing: border-box; font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Be Vietnam Pro', sans-serif; }

    #ph-toggle {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483646;
      width: 44px; height: 44px; border-radius: 50%; cursor: pointer;
      background: #fff;
      border: 1.5px solid rgba(200, 170, 165, 0.5);
      box-shadow: 0 4px 20px rgba(140, 80, 70, 0.12), 0 1px 4px rgba(0,0,0,0.06);
      display: flex; align-items: center; justify-content: center;
      transition: box-shadow 0.2s, transform 0.15s;
    }
    #ph-toggle:hover { transform: scale(1.06); box-shadow: 0 6px 24px rgba(140, 80, 70, 0.18); }

    .ph-badge {
      position: absolute; top: -3px; right: -3px;
      background: #d44b2a; color: #fff;
      font-size: 9px; font-weight: 600;
      width: 16px; height: 16px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 1.5px solid #fff;
    }

    /* ── Panel ── */
    #ph-panel {
      position: fixed; bottom: 78px; right: 24px; z-index: 2147483645;
      width: 340px; max-height: 580px;
      background: #fffaf8;
      border: 1px solid rgba(210, 185, 178, 0.45);
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(100, 60, 50, 0.1), 0 2px 8px rgba(0,0,0,0.05);
      display: flex; flex-direction: column;
      overflow: hidden;
      transition: opacity 0.18s, transform 0.18s;
    }
    #ph-panel.ph-hidden { opacity: 0; transform: translateY(8px) scale(0.98); pointer-events: none; }

    /* ── Header ── */
    .ph-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid rgba(210, 185, 178, 0.3);
      background: #fff;
      flex-shrink: 0;
    }
    .ph-logo-wrap {
      width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
      background: #fff5f2;
      border: 1px solid rgba(210, 180, 170, 0.35);
      display: flex; align-items: center; justify-content: center;
    }
    .ph-header-text { flex: 1; min-width: 0; }
    .ph-header-title {
      font-size: 13px; font-weight: 600; color: #2d1f1f; letter-spacing: -0.2px; line-height: 1.2;
    }
    .ph-header-sub {
      font-size: 10px; color: #a08080; margin-top: 1px; line-height: 1;
    }
    .ph-close {
      width: 28px; height: 28px; border-radius: 7px; border: none; cursor: pointer;
      background: #f5eded; color: #8b6f6f;
      font-size: 13px; line-height: 1; padding: 0;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.15s;
    }
    .ph-close:hover { background: #ecddd8; color: #5a3535; }

    /* ── Current product ── */
    .ph-current {
      padding: 11px 16px 10px;
      border-bottom: 1px solid rgba(210, 185, 178, 0.25);
      background: #fffcfb;
      flex-shrink: 0;
    }
    .ph-current-label {
      font-size: 9px; font-weight: 600; letter-spacing: 1.4px;
      color: #b09090; text-transform: uppercase; margin-bottom: 5px;
    }
    .ph-current-name {
      font-size: 12px; color: #2d1f1f; line-height: 1.4;
      overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      margin-bottom: 6px;
    }
    .ph-current-price { display: flex; align-items: center; gap: 8px; }
    .ph-current-price-value { font-size: 16px; font-weight: 700; color: #c83020; letter-spacing: -0.3px; }
    .ph-platform-tag {
      font-size: 10px; font-weight: 600; padding: 2px 8px;
      border-radius: 5px; letter-spacing: 0.2px;
    }

    /* ── Body (scrollable) ── */
    #ph-body {
      flex: 1; overflow-y: auto; min-height: 0;
      padding: 0;
      scrollbar-width: thin; scrollbar-color: rgba(200,170,165,0.4) transparent;
    }

    /* ── Section title ── */
    .ph-section-title {
      font-size: 9px; font-weight: 700; letter-spacing: 1.4px;
      color: #b09090; text-transform: uppercase;
      padding: 12px 16px 6px;
    }

    /* ── Price row ── */
    a.ph-price-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; cursor: pointer; text-decoration: none;
      border-bottom: 1px solid rgba(240, 225, 220, 0.5);
      transition: background 0.12s;
    }
    a.ph-price-row:hover { background: #fff5f2; }
    a.ph-price-row:last-of-type { border-bottom: none; }

    /* Platform avatar — KHÔNG dùng chữ cái lạc lõng, dùng dot màu brand + label */
    .ph-row-avatar {
      width: 28px; height: 28px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
      letter-spacing: -0.5px;
    }

    .ph-row-info { flex: 1; min-width: 0; }
    .ph-row-name { font-size: 12px; font-weight: 600; color: #2d1f1f; line-height: 1.2; }
    .ph-row-stock { font-size: 10px; margin-top: 2px; }
    .ph-row-stock.in-stock  { color: #3a8060; }
    .ph-row-stock.out-stock { color: #a07050; }

    .ph-row-right { text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .ph-row-price { font-size: 13px; font-weight: 700; color: #2d1f1f; letter-spacing: -0.2px; }

    .ph-row-diff { font-size: 10px; font-weight: 500; }
    .ph-row-diff.cheaper { color: #3a8060; }
    .ph-row-diff.pricier { color: #c05030; }
    .ph-row-diff.same    { color: #a08080; }

    /* Best badge — căn chỉnh gọn trong ph-row-right */
    .ph-best-badge {
      font-size: 9px; font-weight: 700; letter-spacing: 0.8px;
      padding: 2px 6px; border-radius: 4px;
      background: #2d1f1f; color: #fff;
      text-transform: uppercase;
    }

    /* ── Chart ── */
    .ph-chart-wrap {
      padding: 8px 16px 4px;
    }
    #ph-price-chart {
      border-radius: 10px;
      border: 1px solid rgba(210, 185, 178, 0.3);
      background: #fffcfb;
      display: block;
    }

    /* Legend — căn đều, không bị cắt */
    .ph-chart-legend {
      display: flex; flex-wrap: wrap; gap: 6px 14px;
      padding: 6px 16px 10px;
    }
    .ph-legend-item {
      display: inline-flex; align-items: center;
      font-size: 10px; color: #8b7070; gap: 5px;
    }
    .ph-legend-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

    /* ── Loading ── */
    .ph-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 36px 16px; gap: 12px;
    }
    .ph-spinner {
      width: 24px; height: 24px; border-radius: 50%;
      border: 1.5px solid rgba(200, 168, 76, 0.15);
      border-top-color: #c9a84c;
      animation: ph-spin 0.7s linear infinite;
    }
    @keyframes ph-spin { to { transform: rotate(360deg); } }
    .ph-loading-text { font-size: 12px; color: #a08080; }

    /* ── Empty ── */
    .ph-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 36px 24px; gap: 8px; text-align: center;
      font-size: 12px; color: #b09090; line-height: 1.5;
    }

    /* ── Footer ── */
    .ph-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 14px;
      border-top: 1px solid rgba(210, 185, 178, 0.3);
      background: #fff; flex-shrink: 0;
    }
    .ph-footer-brand { font-size: 10px; color: #b09080; font-weight: 500; letter-spacing: 0.3px; }
    .ph-footer-brand span { color: #c9a84c; }
    .ph-refresh {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; color: #8b7070; cursor: pointer;
      border: 1px solid rgba(200, 180, 175, 0.4); border-radius: 6px;
      background: #f9f4f2; padding: 4px 10px;
      transition: background 0.15s, color 0.15s;
    }
    .ph-refresh:hover { background: #f0e8e4; color: #5a3535; }

    /* ── Actions ── */
    .ph-actions-container {
      padding: 10px 16px 12px;
      border-top: 1px solid rgba(210, 185, 178, 0.3);
      background: #fffcfb;
    }
    .ph-actions-row { display: flex; gap: 8px; margin-bottom: 0; }
    .ph-action-btn {
      flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      font-size: 11px; font-weight: 600; padding: 7px 12px; border-radius: 8px; cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
      letter-spacing: 0.1px;
    }
    .ph-wishlist-btn {
      background: #fff5ee; border: 1.5px solid rgba(210, 160, 130, 0.4); color: #b56030;
    }
    .ph-wishlist-btn:hover { background: #ffeadc; }
    .ph-alert-btn {
      background: #eef3ff; border: 1.5px solid rgba(100, 130, 220, 0.3); color: #3050b0;
    }
    .ph-alert-btn:hover { background: #dde6ff; }
    .ph-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .ph-alert-form {
      margin-top: 8px; padding: 10px 12px; border-radius: 8px;
      background: #f9f4f0; border: 1px solid rgba(210, 185, 178, 0.4);
    }
    .ph-alert-label { font-size: 11px; color: #6b5050; font-weight: 600; margin-bottom: 6px; }
    .ph-alert-row { display: flex; gap: 6px; }
    .ph-alert-input {
      flex: 1; padding: 6px 10px; border-radius: 6px;
      border: 1px solid rgba(200, 175, 170, 0.5); background: #fff;
      font-size: 12px; color: #2d1f1f; outline: none;
    }
    .ph-alert-input:focus { border-color: #c9a84c; }
    .ph-alert-submit {
      padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer;
      background: #2d1f1f; color: #fff; font-size: 11px; font-weight: 600;
      transition: background 0.15s;
    }
    .ph-alert-submit:hover { background: #4a3030; }
    .ph-alert-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .ph-auth-prompt { font-size: 11px; color: #8b7070; text-align: center; padding: 6px 0; }
    .ph-auth-link { color: #c9a84c; font-weight: 600; text-decoration: none; }
    .ph-auth-link:hover { text-decoration: underline; }

    .ph-action-msg {
      margin-top: 7px; padding: 6px 10px; border-radius: 6px;
      font-size: 11px; font-weight: 500; text-align: center;
    }
    .ph-action-msg-success { background: #e8f5ee; color: #2d6040; border: 1px solid rgba(60,145,90,0.2); }
    .ph-action-msg-error   { background: #fceaea; color: #8b2020; border: 1px solid rgba(200,50,50,0.2); }
    .ph-action-msg-info    { background: #fdf8e8; color: #7a6020; border: 1px solid rgba(200,170,50,0.2); }

    /* ── Chart tooltip ── */
    .ph-chart-tooltip {
      position: fixed; z-index: 2147483647;
      background: #2d1f1f; color: #f5e8e0;
      border-radius: 8px; padding: 8px 12px;
      font-size: 11px; pointer-events: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      min-width: 120px;
    }
    .ph-tip-header { display: flex; align-items: center; gap: 5px; font-weight: 600; margin-bottom: 3px; color: #f5e8e0; }
    .ph-tip-dot    { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .ph-tip-price  { font-size: 13px; font-weight: 700; color: #f5c380; }
    .ph-tip-date   { font-size: 10px; color: rgba(245,232,224,0.6); margin-top: 2px; }
  `;
  document.head.appendChild(s);
}

// ── Mount ────────────────────────────────────────────────────

function mountOverlay(onToggle, onRefresh) {
  if (document.getElementById("pricehawk-root")) return;
  injectStyles();

  const root = document.createElement("div");
  root.id = "pricehawk-root";
  root.innerHTML = `
    <div id="ph-toggle">
      <img id="ph-toggle-jelly" src="" alt="PH" style="width:22px;height:22px;object-fit:contain;pointer-events:none;"/>
      <span class="ph-badge" id="ph-badge" style="display:none">↓</span>
    </div>
    <div id="ph-panel" class="ph-hidden">
      <div class="ph-header">
        <div class="ph-logo-wrap">
          <img id="ph-logo-jelly" src="" alt="PH" style="width:18px;height:18px;object-fit:contain;pointer-events:none;"/>
        </div>
        <div class="ph-header-text">
          <div class="ph-header-title">PriceHawk</div>
          <div class="ph-header-sub">So sánh giá thông minh</div>
        </div>
        <button class="ph-close" id="ph-close">✕</button>
      </div>
      <div id="ph-current-section" class="ph-current" style="display:none;"></div>
      <div id="ph-body">
        <div class="ph-empty">
          <div style="margin-bottom:4px;">${ICON_SEARCH}</div>
          Nhấn nút bên dưới để bắt đầu tìm kiếm
        </div>
      </div>
      <div class="ph-footer">
        <div class="ph-footer-brand">Price<span>✦</span>Hawk v1.0</div>
        <button class="ph-refresh" id="ph-refresh">${ICON_REFRESH} Làm mới</button>
      </div>
    </div>
  `;

  const tip = document.createElement("div");
  tip.id = "ph-chart-tooltip";
  tip.className = "ph-chart-tooltip";
  tip.style.display = "none";
  root.appendChild(tip);

  document.body.appendChild(root);

  const jellyUrl = chrome.runtime.getURL("assets/icons/jellyfish-ai.png");
  document.getElementById("ph-toggle-jelly").src = jellyUrl;
  document.getElementById("ph-logo-jelly").src   = jellyUrl;

  const panel = document.getElementById("ph-panel");

  document.getElementById("ph-toggle").addEventListener("click", () => {
    if (panel.classList.contains("ph-hidden")) {
      panel.classList.remove("ph-hidden");
      if (onToggle) onToggle();
    } else {
      panel.classList.add("ph-hidden");
    }
  });

  document.getElementById("ph-close").addEventListener("click", () => {
    panel.classList.add("ph-hidden");
  });

  if (onRefresh) {
    document.getElementById("ph-refresh").addEventListener("click", onRefresh);
  }
}

// ── Render states ────────────────────────────────────────────

function renderCurrentProduct(info, price) {
  const sec = document.getElementById("ph-current-section");
  if (!sec) return;
  const meta = PLATFORM_META[(info.platform || "").toLowerCase()] || {};
  sec.style.display = "block";
  sec.innerHTML = `
    <div class="ph-current-label">Sản phẩm đang xem</div>
    <div class="ph-current-name">${info.name || "Đang đọc..."}</div>
    ${price ? `
      <div class="ph-current-price">
        <span class="ph-current-price-value">${formatPrice(price)}</span>
        <span class="ph-platform-tag" style="background:${meta.bg || 'rgba(210,185,178,0.12)'}; color:${meta.color || '#8b6f6f'};">
          ${meta.label || info.platform}
        </span>
      </div>` : ""}
  `;
}

function renderLoading() {
  const body = document.getElementById("ph-body");
  if (body) body.innerHTML = `
    <div class="ph-loading">
      <div class="ph-spinner"></div>
      <div class="ph-loading-text">Đang phân tích dữ liệu...</div>
    </div>`;
}

function renderError(msg) {
  const body = document.getElementById("ph-body");
  if (body) body.innerHTML = `
    <div class="ph-empty">
      <div style="font-size:20px; color:#c9a84c; margin-bottom:4px;">✦</div>
      ${msg || "Lỗi kết nối"}
    </div>`;
}

// ── Chart (dùng màu brand, không dùng default lib color) ────

function renderPriceChart(platforms, canvas) {
  if (!canvas || !platforms?.length) return [];

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const CW = 308, CH = 185;
  canvas.width  = CW * dpr;
  canvas.height = CH * dpr;
  canvas.style.width  = CW + "px";
  canvas.style.height = CH + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const PAD = { top: 12, right: 12, bottom: 28, left: 52 };
  const chartW = CW - PAD.left - PAD.right;
  const chartH = CH - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, CW, CH);

  const series = platforms
    .map(plat => {
      const key   = (plat.platformName || "").toLowerCase();
      const meta  = PLATFORM_META[key];
      const color = CHART_COLORS[key] || CHART_COLORS.default;
      const label = meta?.label || plat.platformName || "?";
      const pts   = (plat.prices || [])
        .slice(-6)
        .map(pt => ({ ts: new Date(pt.crawledAt).getTime(), price: Number(pt.price) }))
        .filter(pt => pt.price > 0 && !isNaN(pt.ts))
        .sort((a, b) => a.ts - b.ts);
      return { color, label, pts };
    })
    .filter(s => s.pts.length > 0);

  if (!series.length) {
    ctx.fillStyle = "#b09090";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Chưa có dữ liệu lịch sử", CW / 2, CH / 2);
    return [];
  }

  const allTs     = series.flatMap(s => s.pts.map(p => p.ts));
  const allPrices = series.flatMap(s => s.pts.map(p => p.price));
  const minTs = Math.min(...allTs), maxTs = Math.max(...allTs);
  const minP  = Math.min(...allPrices), maxP = Math.max(...allPrices);
  const pRange = (maxP - minP) || (maxP * 0.1) || 1;
  const pMin  = minP - pRange * 0.15, pMax = maxP + pRange * 0.15;
  const pSpan = pMax - pMin;
  const tSpan = maxTs - minTs || 1;

  const toX   = ts => PAD.left + ((ts - minTs) / tSpan) * chartW;
  const toY   = p  => PAD.top + chartH - ((p - pMin) / pSpan) * chartH;
  const safeX = (ts, pts) => pts.length === 1 ? PAD.left + chartW / 2 : toX(ts);

  // Grid
  const GRIDS = 4;
  for (let i = 0; i <= GRIDS; i++) {
    const y     = PAD.top + (chartH / GRIDS) * i;
    const price = pMax - (pSpan / GRIDS) * i;
    ctx.strokeStyle = "rgba(210, 185, 178, 0.35)";
    ctx.lineWidth   = 0.5;
    ctx.setLineDash(i === GRIDS ? [] : [2, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Y-axis labels — contrast tốt hơn
    ctx.fillStyle = "#8b7070";
    ctx.font = "9px monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatKPrice(price), PAD.left - 5, y);
  }

  // Lines
  series.forEach(({ color, pts }) => {
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = "round";
    ctx.lineCap     = "round";
    ctx.setLineDash([]);
    ctx.shadowColor = "transparent";
    ctx.beginPath();
    pts.forEach((pt, i) => {
      const x = safeX(pt.ts, pts), y = toY(pt.price);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // Dots
  const allDots = [];
  series.forEach(({ color, label, pts }) => {
    pts.forEach(pt => {
      const x = safeX(pt.ts, pts), y = toY(pt.price);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      allDots.push({ x, y, price: pt.price, label, date: new Date(pt.ts), color });
    });
  });

  // X-axis labels
  const uniqueTs  = [...new Set(series.flatMap(s => s.pts.map(p => p.ts)))].sort((a, b) => a - b);
  const maxLabels = Math.min(uniqueTs.length, 4);
  const showIdxs  = maxLabels <= 1
    ? [0]
    : Array.from({ length: maxLabels }, (_, i) => Math.round(i * (uniqueTs.length - 1) / (maxLabels - 1)));
  const showTs = [...new Set(showIdxs)].map(i => uniqueTs[i]);
  ctx.fillStyle = "#a08080";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  showTs.forEach(ts => {
    const d  = new Date(ts);
    const x  = tSpan > 1 ? toX(ts) : PAD.left + chartW / 2;
    const cx = Math.max(PAD.left + 10, Math.min(x, PAD.left + chartW - 10));
    ctx.fillText(`${d.getDate()}/${d.getMonth() + 1}`, cx, PAD.top + chartH + 5);
  });

  return allDots;
}

function setupChartHover(canvas, dots) {
  if (!canvas || !dots.length) return;
  const tooltip = document.getElementById("ph-chart-tooltip");
  if (!tooltip) return;

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let nearest = null, minDist = 15;
    for (const dot of dots) {
      const d = Math.hypot(dot.x - mx, dot.y - my);
      if (d < minDist) { minDist = d; nearest = dot; }
    }

    if (nearest) {
      canvas.style.cursor = "crosshair";
      const d = nearest.date;
      tooltip.innerHTML = `
        <div class="ph-tip-header">
          <span class="ph-tip-dot" style="background:${nearest.color};"></span>
          ${nearest.label}
        </div>
        <div class="ph-tip-price">${formatPrice(nearest.price)}</div>
        <div class="ph-tip-date">${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}</div>`;
      tooltip.style.display = "block";
      let tx = e.clientX + 14, ty = e.clientY - 60;
      if (tx + 160 > window.innerWidth) tx = e.clientX - 170;
      if (ty < 8) ty = e.clientY + 14;
      tooltip.style.left = tx + "px";
      tooltip.style.top  = ty + "px";
    } else {
      canvas.style.cursor = "default";
      tooltip.style.display = "none";
    }
  });

  canvas.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
    canvas.style.cursor = "default";
  });
}

function renderChartLegend(platforms, container) {
  const prev = container.querySelector(".ph-chart-legend");
  if (prev) prev.remove();

  const items = platforms.map(plat => {
    const key   = (plat.platformName || "").toLowerCase();
    const color = CHART_COLORS[key] || CHART_COLORS.default;
    const label = PLATFORM_META[key]?.label || plat.platformName || "?";
    return { color, label };
  }).filter(m => m.label);

  if (!items.length) return;
  const div = document.createElement("div");
  div.className = "ph-chart-legend";
  div.innerHTML = items.map(m => `
    <span class="ph-legend-item">
      <span class="ph-legend-dot" style="background:${m.color};"></span>
      ${m.label}
    </span>`).join("");
  container.appendChild(div);
}

// ── Main render ──────────────────────────────────────────────

function renderComparison(compareData, priceHistory) {
  const body = document.getElementById("ph-body");
  if (!body) return;

  if (!compareData) { renderLoading(); return; }

  const { data, currentPrice, platform } = compareData;
  const items = Array.isArray(data) ? data : (data?.comparisons || data?.results || data?.data || []);

  if (!items.length) {
    body.innerHTML = `
      <div class="ph-empty">
        <div style="font-size:20px; color:#c9a84c; margin-bottom:4px;">✦</div>
        Chưa có dữ liệu giá từ sàn khác
      </div>`;
    return;
  }

  const sorted = [...items].filter(i => i.price > 0).sort((a, b) => a.price - b.price);

  let html = `<div class="ph-section-title">So sánh tại ${sorted.length} sàn</div>`;

  sorted.forEach((item, idx) => {
    const p    = (item.platformName || item.platform || "").toLowerCase();
    const meta = PLATFORM_META[p] || { label: item.platformName || item.platform || "Sàn khác", bg: "rgba(200,180,175,0.1)", color: "#8b7070", initial: "?" };
    const isBest = idx === 0;
    const d = priceDiff(currentPrice, item.price);

    let diffHtml = "";
    if (d && p !== platform) {
      if (d.pct < -1)     diffHtml = `<div class="ph-row-diff cheaper">↓ ${Math.abs(d.pct)}% rẻ hơn</div>`;
      else if (d.pct > 1) diffHtml = `<div class="ph-row-diff pricier">↑ ${d.pct}% đắt hơn</div>`;
      else                diffHtml = `<div class="ph-row-diff same">Giá tương đương</div>`;
    }

    const stockHtml = item.inStock === false
      ? `<div class="ph-row-stock out-stock">Hết hàng</div>`
      : `<div class="ph-row-stock in-stock">Còn hàng</div>`;

    html += `
      <a class="ph-price-row${isBest ? " ph-best" : ""}" href="${item.productUrl || item.url || "#"}" target="_blank" rel="noopener">
        <div class="ph-row-avatar" style="background:${meta.bg}; color:${meta.color};">${meta.initial}</div>
        <div class="ph-row-info">
          <div class="ph-row-name">${meta.label}</div>
          ${stockHtml}
        </div>
        <div class="ph-row-right">
          ${isBest ? `<span class="ph-best-badge">Tốt nhất</span>` : ""}
          <div class="ph-row-price">${formatPrice(item.price)}</div>
          ${diffHtml}
        </div>
      </a>`;
  });

  // History chart
  let histPlatforms = [];
  if (priceHistory?.priceHistory) {
    histPlatforms = priceHistory.priceHistory?.platforms || [];
    const hasHistory = histPlatforms.some(p => p.prices && p.prices.length > 1);

    html += `<div class="ph-section-title" style="margin-top:4px; border-top:1px solid rgba(210,185,178,0.3); padding-top:12px;">Lịch sử giá</div>`;

    if (hasHistory) {
      html += `
        <div class="ph-chart-wrap">
          <canvas id="ph-price-chart"></canvas>
        </div>`;
    } else {
      html += `
        <div class="ph-empty" style="padding:16px 24px; font-size:11px; color:#b09090;">
          Chưa đủ dữ liệu (cần trên 24h)
        </div>`;
    }
  }

  if (compareData.productId) {
    html += `<div id="ph-actions" class="ph-actions-container"></div>`;
  }

  body.innerHTML = html;

  if (histPlatforms.length > 0) {
    const chartCanvas = document.getElementById("ph-price-chart");
    if (chartCanvas) {
      const dots = renderPriceChart(histPlatforms, chartCanvas);
      setupChartHover(chartCanvas, dots);
      renderChartLegend(histPlatforms, chartCanvas.parentElement);
    }
  }

  if (sorted[0] && currentPrice && sorted[0].price < currentPrice) {
    const badge = document.getElementById("ph-badge");
    if (badge) { badge.style.display = "flex"; badge.textContent = "↓"; }
  }

  if (compareData.productId) {
    renderAuthActions(compareData.productId);
  }
}

// ── Auth actions ─────────────────────────────────────────────

function renderAuthActions(productId) {
  const container = document.getElementById("ph-actions");
  if (!container || !chrome?.runtime?.id) return;

  chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (response) => {
    const auth = response?.auth;

    if (!auth) {
      container.innerHTML = `
        <div class="ph-auth-prompt">
          <a href="${CONFIG.WEB_APP_URL}/login" target="_blank" rel="noopener" class="ph-auth-link">Đăng nhập</a>
          để dùng Wishlist &amp; Cảnh báo giá
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="ph-actions-row">
        <button class="ph-action-btn ph-wishlist-btn" id="ph-btn-wishlist">
          ${ICON_HEART} Wishlist
        </button>
        <button class="ph-action-btn ph-alert-btn" id="ph-btn-alert">
          ${ICON_BELL} Cảnh báo giá
        </button>
      </div>
      <div id="ph-alert-form" class="ph-alert-form" style="display:none;">
        <div class="ph-alert-label">Cảnh báo khi giá dưới:</div>
        <div class="ph-alert-row">
          <input type="number" id="ph-alert-price" class="ph-alert-input" placeholder="Nhập giá tối đa..." min="1000" step="1000"/>
          <button class="ph-alert-submit" id="ph-alert-submit">Lưu</button>
        </div>
      </div>
      <div id="ph-action-msg" class="ph-action-msg" style="display:none;"></div>`;

    document.getElementById("ph-btn-wishlist").addEventListener("click", () => {
      const btn = document.getElementById("ph-btn-wishlist");
      btn.disabled = true;
      btn.textContent = "Đang lưu...";
      chrome.runtime.sendMessage({ type: "ADD_WISHLIST", payload: { productId } }, (res) => {
        const msgEl = document.getElementById("ph-action-msg");
        if (res?.success) {
          btn.textContent = "✓ Đã lưu";
          showActionMsg(msgEl, "Đã thêm vào Wishlist", "success");
        } else {
          btn.innerHTML = `${ICON_HEART} Wishlist`;
          btn.disabled = false;
          showActionMsg(msgEl, res?.error === "ALREADY_EXISTS" ? "Sản phẩm đã có trong Wishlist" : "Lỗi, thử lại", "info");
        }
      });
    });

    document.getElementById("ph-btn-alert").addEventListener("click", () => {
      const form = document.getElementById("ph-alert-form");
      form.style.display = form.style.display === "none" ? "block" : "none";
    });

    document.getElementById("ph-alert-submit").addEventListener("click", () => {
      const priceVal = parseInt(document.getElementById("ph-alert-price").value, 10);
      const msgEl    = document.getElementById("ph-action-msg");
      if (!priceVal || priceVal < 1000) {
        showActionMsg(msgEl, "Nhập giá hợp lệ (tối thiểu 1.000₫)", "error");
        return;
      }
      const submitBtn = document.getElementById("ph-alert-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "...";
      chrome.runtime.sendMessage({
        type: "ADD_PRICE_ALERT",
        payload: { productId, targetPrice: priceVal, platformId: null },
      }, (res) => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Lưu";
        if (res?.success) {
          document.getElementById("ph-alert-form").style.display = "none";
          showActionMsg(msgEl, "Đã bật cảnh báo giá", "success");
        } else {
          showActionMsg(msgEl, "Lỗi: " + (res?.error || "Thử lại"), "error");
        }
      });
    });
  });
}

function showActionMsg(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className   = `ph-action-msg ph-action-msg-${type}`;
  el.style.display = "block";
  setTimeout(() => { if (el) el.style.display = "none"; }, 3500);
}