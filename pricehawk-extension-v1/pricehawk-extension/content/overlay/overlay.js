// ============================================================
// PriceHawk — Overlay UI
// Load trước main.js. Cung cấp tất cả hàm render UI.
// ============================================================

const PLATFORM_META = {
  shopee:   { label: "Shopee",   emoji: "🛒", bg: "#ffe5dc", color: "#c04020" },
  lazada:   { label: "Lazada",   emoji: "🛍️",  bg: "#e8eaff", color: "#3848c0" },
  tiki:     { label: "Tiki",     emoji: "📦", bg: "#ddeeff", color: "#0e68c0" },
  hasaki:   { label: "Hasaki",   emoji: "🌿", bg: "#dff5e8", color: "#1e7840" },
  watsons:  { label: "Watsons",  emoji: "💊", bg: "#dff5f4", color: "#007878" },
  guardian: { label: "Guardian", emoji: "💄", bg: "#ffe5e4", color: "#c02828" },
  cocolux:  { label: "Cocolux",  emoji: "✨", bg: "#ffe8f4", color: "#981858" },
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

// ── Mount ────────────────────────────────────────────────────

/**
 * @param {Function} onToggle  - gọi khi mở panel (triggerCompareFromClick)
 * @param {Function} onRefresh - gọi khi nhấn nút làm mới
 */
function mountOverlay(onToggle, onRefresh) {
  if (document.getElementById("pricehawk-root")) return;

  const root = document.createElement("div");
  root.id = "pricehawk-root";
  root.innerHTML = `
    <div id="ph-toggle">
      <img id="ph-toggle-jelly" src="" alt="🪼" style="width:34px;height:34px;object-fit:contain;pointer-events:none;"/>
      <span class="ph-badge" id="ph-badge" style="display:none">↓</span>
    </div>
    <div id="ph-panel" class="ph-hidden">
      <div class="ph-header">
        <div class="ph-logo-wrap">
          <img id="ph-logo-jelly" src="" alt="🪼" style="width:28px;height:28px;object-fit:contain;pointer-events:none;"/>
        </div>
        <div class="ph-header-text">
          <div class="ph-header-title">PriceHawk</div>
          <div class="ph-header-sub">So sánh giá thông minh ✦</div>
        </div>
        <button class="ph-close" id="ph-close">✕</button>
      </div>
      <div id="ph-current-section" class="ph-current" style="display:none"></div>
      <div id="ph-body">
        <div class="ph-empty">
          <div class="ph-empty-icon">🪼</div>
          Nhấn nút trên để bắt đầu so sánh giá sản phẩm
        </div>
      </div>
      <div class="ph-footer">
        <div class="ph-footer-brand">Price<span>✦Hawk</span> v1.0</div>
        <button class="ph-refresh" id="ph-refresh">↻ Làm mới</button>
      </div>
    </div>
  `;
  // Tooltip element cho hover chart — nằm ngoài panel để không bị clip
  const tip = document.createElement("div");
  tip.id = "ph-chart-tooltip";
  tip.className = "ph-chart-tooltip";
  tip.style.display = "none";
  root.appendChild(tip);

  document.body.appendChild(root);

  // Dùng chrome.runtime.getURL để load ảnh extension vào content script
  const jellyUrl = chrome.runtime.getURL("assets/icons/jellyfish-ai.png");
  document.getElementById("ph-toggle-jelly").src = jellyUrl;
  document.getElementById("ph-logo-jelly").src = jellyUrl;

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
  const meta = PLATFORM_META[info.platform] || {};
  sec.style.display = "block";
  sec.innerHTML = `
    <div class="ph-current-label">Sản phẩm đang xem</div>
    <div class="ph-current-name">${info.name || "Đang đọc..."}</div>
    ${price ? `
      <div class="ph-current-price">
        <span class="ph-current-price-value">${formatPrice(price)}</span>
        <span class="ph-platform-tag" style="background:${meta.bg || '#f5ece8'};color:${meta.color || '#9a7070'}">
          ${meta.emoji || ""} ${meta.label || info.platform}
        </span>
      </div>` : ""}
  `;
}

function renderLoading() {
  const body = document.getElementById("ph-body");
  if (body) body.innerHTML = `
    <div class="ph-loading">
      <div class="ph-spinner"></div>
      <div class="ph-loading-text">Đang tìm giá tốt hơn...</div>
    </div>`;
}

function renderError(msg) {
  const body = document.getElementById("ph-body");
  if (body) body.innerHTML = `<div class="ph-empty"><div class="ph-empty-icon">🌸</div>${msg || "Lỗi kết nối backend"}</div>`;
}

function renderPriceChart(platforms, canvas) {
  if (!canvas || !platforms?.length) return [];

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const CW = 330;
  const CH = 195;
  canvas.width  = CW * dpr;
  canvas.height = CH * dpr;
  canvas.style.width  = CW + "px";
  canvas.style.height = CH + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const PAD = { top: 14, right: 16, bottom: 30, left: 58 };
  const chartW = CW - PAD.left - PAD.right;
  const chartH = CH - PAD.top - PAD.bottom;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
  bgGrad.addColorStop(0, "#fffcfa");
  bgGrad.addColorStop(1, "#fff8f4");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CW, CH);

  const series = platforms
    .map(plat => {
      const key  = (plat.platformName || "").toLowerCase();
      const meta = PLATFORM_META[key] || { color: "#b09090", label: plat.platformName || "?" };
      const pts  = (plat.prices || [])
        .slice(-6)
        .map(pt => ({ ts: new Date(pt.crawledAt).getTime(), price: Number(pt.price) }))
        .filter(pt => pt.price > 0 && !isNaN(pt.ts))
        .sort((a, b) => a.ts - b.ts);
      return { meta, pts };
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

  // Grid lines (dashed, except bottom)
  const GRIDS = 4;
  for (let i = 0; i <= GRIDS; i++) {
    const y     = PAD.top + (chartH / GRIDS) * i;
    const price = pMax - (pSpan / GRIDS) * i;
    ctx.strokeStyle = i === GRIDS ? "#ddd0cc" : "#f0e4e0";
    ctx.lineWidth   = i === GRIDS ? 1 : 0.5;
    ctx.setLineDash(i === GRIDS ? [] : [3, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#b09090";
    ctx.font = "9px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatKPrice(price), PAD.left - 5, y);
  }

  // Y-axis
  ctx.strokeStyle = "#ddd0cc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, PAD.top + chartH);
  ctx.stroke();

  // Area fill under each line
  series.forEach(({ meta, pts }) => {
    if (pts.length < 2) return;
    ctx.beginPath();
    pts.forEach((pt, i) => {
      const x = safeX(pt.ts, pts), y = toY(pt.price);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(safeX(pts[pts.length - 1].ts, pts), PAD.top + chartH);
    ctx.lineTo(safeX(pts[0].ts, pts), PAD.top + chartH);
    ctx.closePath();
    const aGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
    aGrad.addColorStop(0, meta.color + "28");
    aGrad.addColorStop(1, meta.color + "04");
    ctx.fillStyle = aGrad;
    ctx.fill();
  });

  // Lines
  series.forEach(({ meta, pts }) => {
    ctx.strokeStyle = meta.color;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = "round";
    ctx.lineCap     = "round";
    ctx.setLineDash([]);
    ctx.shadowColor = meta.color + "44";
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    pts.forEach((pt, i) => {
      const x = safeX(pt.ts, pts), y = toY(pt.price);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // Dots — collect positions for hover
  const allDots = [];
  series.forEach(({ meta, pts }) => {
    pts.forEach(pt => {
      const x = safeX(pt.ts, pts), y = toY(pt.price);
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fffcfa";
      ctx.fill();
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      allDots.push({ x, y, price: pt.price, label: meta.label, date: new Date(pt.ts), color: meta.color });
    });
  });

  // X-axis date labels
  const uniqueTs  = [...new Set(series.flatMap(s => s.pts.map(p => p.ts)))].sort((a, b) => a - b);
  const maxLabels = Math.min(uniqueTs.length, 4);
  const showIdxs  = maxLabels <= 1
    ? [0]
    : Array.from({ length: maxLabels }, (_, i) => Math.round(i * (uniqueTs.length - 1) / (maxLabels - 1)));
  const showTs = [...new Set(showIdxs)].map(i => uniqueTs[i]);
  ctx.fillStyle = "#b09090";
  ctx.font = "8.5px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  showTs.forEach(ts => {
    const d  = new Date(ts);
    const x  = tSpan > 1 ? toX(ts) : PAD.left + chartW / 2;
    const cx = Math.max(PAD.left + 10, Math.min(x, PAD.left + chartW - 10));
    ctx.fillText(`${d.getDate()}/${d.getMonth() + 1}`, cx, PAD.top + chartH + 6);
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

    let nearest = null, minDist = 20;
    for (const dot of dots) {
      const d = Math.hypot(dot.x - mx, dot.y - my);
      if (d < minDist) { minDist = d; nearest = dot; }
    }

    if (nearest) {
      canvas.style.cursor = "crosshair";
      const d = nearest.date;
      tooltip.innerHTML = `
        <div class="ph-tip-header">
          <span class="ph-tip-dot" style="background:${nearest.color}"></span>
          ${nearest.label}
        </div>
        <div class="ph-tip-price">${formatPrice(nearest.price)}</div>
        <div class="ph-tip-date">${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}</div>`;
      tooltip.style.display = "block";
      let tx = e.clientX + 14, ty = e.clientY - 60;
      if (tx + 160 > window.innerWidth)  tx = e.clientX - 170;
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
    const key = (plat.platformName || "").toLowerCase();
    return PLATFORM_META[key] || { color: "#b09090", label: plat.platformName || "?" };
  }).filter(m => m.label);

  if (!items.length) return;
  const div = document.createElement("div");
  div.className = "ph-chart-legend";
  div.innerHTML = items.map(m => `
    <span class="ph-legend-item">
      <span class="ph-legend-dot" style="background:${m.color}; box-shadow:0 0 5px ${m.color}88"></span>
      ${m.label}
    </span>`).join("");
  container.appendChild(div);
}

/**
 * @param {object|null} compareData  - { data, currentPrice, platform, productId }
 * @param {object|null} priceHistory - { productId, priceHistory }
 */
function renderComparison(compareData, priceHistory) {
  const body = document.getElementById("ph-body");
  if (!body) return;

  if (!compareData) {
    renderLoading();
    return;
  }

  const { data, currentPrice, platform } = compareData;
  const items = Array.isArray(data) ? data : (data?.comparisons || data?.results || data?.data || []);

  if (!items.length) {
    body.innerHTML = `<div class="ph-empty"><div class="ph-empty-icon">🔍</div>Chưa có dữ liệu giá từ sàn khác</div>`;
    return;
  }

  const sorted = [...items].filter(i => i.price > 0).sort((a, b) => a.price - b.price);
  let html = `<div class="ph-section-title">So sánh tại ${sorted.length} sàn</div>`;

  sorted.forEach((item, idx) => {
    const p = (item.platformName || item.platform || "").toLowerCase();
    const meta = PLATFORM_META[p] || { label: item.platformName || item.platform || "Sàn khác", emoji: "🏪", bg: "#f5ece8", color: "#9a7070" };
    const isBest = idx === 0;
    const d = priceDiff(currentPrice, item.price);

    let diffHtml = "";
    if (d && p !== platform) {
      if (d.pct < -1)       diffHtml = `<div class="ph-row-diff cheaper">↓ ${Math.abs(d.pct)}% rẻ hơn</div>`;
      else if (d.pct > 1)   diffHtml = `<div class="ph-row-diff pricier">↑ ${d.pct}% đắt hơn</div>`;
      else                  diffHtml = `<div class="ph-row-diff same">Giá tương đương</div>`;
    }

    const stockHtml = item.inStock === false
      ? `<div class="ph-row-stock out-stock">Hết hàng</div>`
      : `<div class="ph-row-stock in-stock">Còn hàng</div>`;

    html += `
      <a class="ph-price-row${isBest ? " ph-best" : ""}" href="${item.productUrl || item.url || "#"}" target="_blank" rel="noopener">
        <div class="ph-row-platform" style="background:${meta.bg}">${meta.emoji}</div>
        <div class="ph-row-info">
          <div class="ph-row-name">${meta.label}</div>
          ${stockHtml}
        </div>
        <div class="ph-row-right">
          <div class="ph-row-price">${formatPrice(item.price)}</div>
          ${diffHtml}
          ${isBest ? `<span class="ph-best-badge">GIÁ TỐT</span>` : ""}
        </div>
      </a>`;
  });

  // Lịch sử giá — biểu đồ đường
  let histPlatforms = [];
  if (priceHistory?.priceHistory) {
    histPlatforms = priceHistory.priceHistory?.platforms || [];
    if (histPlatforms.length > 0) {
      // Kiểm tra có sàn nào có hơn 1 điểm dữ liệu không
      const hasHistory = histPlatforms.some(p => p.prices && p.prices.length > 1);
      if (hasHistory) {
        const warns = histPlatforms.filter(p => p.fakePriceIncreaseWarning)
          .map(p => `<div class="ph-chart-warn">⚠️ ${p.platformName}: Nghi tăng giá ảo</div>`).join("");
        html += `
          <div class="ph-section-title" style="margin-top:12px;border-top:1px solid #f5e8e2;padding-top:10px;">📊 Lịch sử giá (30 ngày)</div>
          <div class="ph-chart-wrap">
            <canvas id="ph-price-chart"></canvas>
            ${warns}
          </div>`;
      } else {
        // Sản phẩm mới — chỉ có 1 điểm dữ liệu
        html += `
          <div class="ph-section-title" style="margin-top:12px;border-top:1px solid #f5e8e2;padding-top:10px;">
            📊 Lịch sử giá
          </div>
          <div class="ph-empty" style="padding:10px 0;font-size:12px;color:#b09090">
            Sản phẩm mới — lịch sử giá sẽ cập nhật sau 24 giờ
          </div>`;
      }
    }
  }

  // Actions (wishlist / alert) — chỉ khi có productId
  if (compareData.productId) {
    html += `<div id="ph-actions" class="ph-actions-container"></div>`;
  }

  body.innerHTML = html;

  // Vẽ biểu đồ giá lịch sử
  if (histPlatforms.length > 0) {
    const chartCanvas = document.getElementById("ph-price-chart");
    if (chartCanvas) {
      const dots = renderPriceChart(histPlatforms, chartCanvas);
      setupChartHover(chartCanvas, dots);
      renderChartLegend(histPlatforms, chartCanvas.parentElement);
    }
  }

  // Hiện badge nếu có giá rẻ hơn
  if (sorted[0] && currentPrice && sorted[0].price < currentPrice) {
    const badge = document.getElementById("ph-badge");
    if (badge) { badge.style.display = "block"; badge.textContent = "↓"; }
  }

  if (compareData.productId) {
    renderAuthActions(compareData.productId);
  }
}

// ── Auth actions (Wishlist & Price Alert) ────────────────────

function renderAuthActions(productId) {
  const container = document.getElementById("ph-actions");
  if (!container) return;

  if (!chrome?.runtime?.id) return;

  chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (response) => {
    const auth = response?.auth;

    if (!auth) {
      container.innerHTML = `
        <div class="ph-auth-prompt">
          🔐 <a href="${CONFIG.WEB_APP_URL}/login" target="_blank" rel="noopener" class="ph-auth-link">Đăng nhập</a>
          để dùng Wishlist &amp; Cảnh báo giá
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="ph-actions-row">
        <button class="ph-action-btn ph-wishlist-btn" id="ph-btn-wishlist">💛 Wishlist</button>
        <button class="ph-action-btn ph-alert-btn" id="ph-btn-alert">🔔 Cảnh báo giá</button>
      </div>
      <div id="ph-alert-form" class="ph-alert-form" style="display:none">
        <div class="ph-alert-label">Cảnh báo khi giá dưới:</div>
        <div class="ph-alert-row">
          <input type="number" id="ph-alert-price" class="ph-alert-input" placeholder="Nhập giá..." min="1000" step="1000"/>
          <button class="ph-alert-submit" id="ph-alert-submit">Lưu</button>
        </div>
      </div>
      <div id="ph-action-msg" class="ph-action-msg" style="display:none"></div>`;

    document.getElementById("ph-btn-wishlist").addEventListener("click", () => {
      const btn = document.getElementById("ph-btn-wishlist");
      btn.disabled = true;
      btn.textContent = "⏳";
      chrome.runtime.sendMessage({ type: "ADD_WISHLIST", payload: { productId } }, (res) => {
        const msgEl = document.getElementById("ph-action-msg");
        if (res?.success) {
          btn.textContent = "✓ Đã lưu";
          showActionMsg(msgEl, "✓ Đã thêm vào Wishlist", "success");
        } else if (res?.error === "ALREADY_EXISTS") {
          btn.textContent = "💛 Wishlist";
          btn.disabled = false;
          showActionMsg(msgEl, "Sản phẩm đã có trong Wishlist", "info");
        } else if (res?.error === "NOT_LOGGED_IN") {
          btn.textContent = "💛 Wishlist";
          btn.disabled = false;
          showActionMsgWithLink(msgEl, "Vui lòng ", "đăng nhập", `${CONFIG.WEB_APP_URL}/login`, " để dùng tính năng này");
        } else {
          btn.textContent = "💛 Wishlist";
          btn.disabled = false;
          showActionMsg(msgEl, "Lỗi: " + (res?.error || "Thử lại"), "error");
        }
      });
    });

    document.getElementById("ph-btn-alert").addEventListener("click", () => {
      const form = document.getElementById("ph-alert-form");
      form.style.display = form.style.display === "none" ? "block" : "none";
    });

    document.getElementById("ph-alert-submit").addEventListener("click", () => {
      const priceVal = parseInt(document.getElementById("ph-alert-price").value, 10);
      const msgEl = document.getElementById("ph-action-msg");
      if (!priceVal || priceVal < 1000) {
        showActionMsg(msgEl, "Nhập giá hợp lệ (tối thiểu 1.000₫)", "error");
        return;
      }
      const submitBtn = document.getElementById("ph-alert-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "⏳";
      chrome.runtime.sendMessage({
        type: "ADD_PRICE_ALERT",
        payload: { productId, targetPrice: priceVal, platformId: null },
      }, (res) => {
        if (res?.success) {
          document.getElementById("ph-alert-form").style.display = "none";
          showActionMsg(msgEl, `✓ Cảnh báo khi dưới ${formatPrice(priceVal)}`, "success");
        } else if (res?.error === "NOT_LOGGED_IN") {
          submitBtn.disabled = false;
          submitBtn.textContent = "Lưu";
          showActionMsgWithLink(msgEl, "Vui lòng ", "đăng nhập", `${CONFIG.WEB_APP_URL}/login`, " để dùng tính năng này");
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = "Lưu";
          showActionMsg(msgEl, "Lỗi: " + (res?.error || "Thử lại"), "error");
        }
      });
    });
  });
}

function showActionMsg(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = `ph-action-msg ph-action-msg-${type}`;
  el.style.display = "block";
  setTimeout(() => { if (el) el.style.display = "none"; }, 3500);
}

function showActionMsgWithLink(el, before, linkText, href, after) {
  if (!el) return;
  el.innerHTML = `${before}<a href="${href}" target="_blank" rel="noopener" class="ph-auth-link">${linkText}</a>${after}`;
  el.className = "ph-action-msg ph-action-msg-error";
  el.style.display = "block";
  setTimeout(() => { if (el) el.style.display = "none"; }, 5000);
}
