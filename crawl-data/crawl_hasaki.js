/**
 * Hasaki Product Crawler - Optimised
 * Usage: node crawl_hasaki.js
 * Requirements: npm install puppeteer
 *
 * Tối ưu so với bản cũ:
 *  - Bỏ việc crawl chi tiết từng sản phẩm (vòng lặp chậm nhất)
 *  - Crawl nhiều brand song song (CONCURRENCY)
 *  - Giảm delay, dùng waitForSelector thay networkidle2
 *  - Ghi file theo batch thay vì từng sản phẩm
 *
 * FIX v3 (root cause fix):
 *  - Hasaki dùng native browser lazy loading (loading="lazy"), KHÔNG dùng data-src
 *  - Puppeteer headless không tự trigger native lazy load khi scroll bằng JS
 *  - Fix: sau khi scroll xong, force tất cả img[loading="lazy"] thành eager
 *    rồi đợi chúng load xong trước khi extract → src sẽ là URL thật
 */

const puppeteer = require("puppeteer");
const fs = require("fs");

// ─── CONFIG ────────────────────────────────────────────────────────────────

const OUTPUT_FILE = "hasaki_full_data.json";

const BRANDS = [
  { name: "Acnes",            url: "https://hasaki.vn/thuong-hieu/acnes.html" },
  { name: "La Roche-Posay",   url: "https://hasaki.vn/thuong-hieu/la-roche-posay.html" },
  { name: "Cocoon",           url: "https://hasaki.vn/thuong-hieu/cocoon.html" },
  { name: "Hada Labo",        url: "https://hasaki.vn/thuong-hieu/hada-labo.html" },
  { name: "Selsun",           url: "https://hasaki.vn/thuong-hieu/selsun.html" },
  { name: "Nivea",            url: "https://hasaki.vn/thuong-hieu/nivea.html" },
  { name: "Sunplay",          url: "https://hasaki.vn/thuong-hieu/sunplay.html" },
  { name: "Head & Shoulders", url: "https://hasaki.vn/thuong-hieu/head-shoulders.html" },
  { name: "Oxy",              url: "https://hasaki.vn/thuong-hieu/oxy.html" },
  { name: "Lifebuoy",         url: "https://hasaki.vn/thuong-hieu/lifebuoy.html" },
  { name: "Melano CC",        url: "https://hasaki.vn/thuong-hieu/melano-cc.html" },
  { name: "Lipice",           url: "https://hasaki.vn/thuong-hieu/lipice.html" },
  { name: "Tsubaki",          url: "https://hasaki.vn/thuong-hieu/tsubaki.html" },
  { name: "Enchanteur",       url: "https://hasaki.vn/thuong-hieu/enchanteur.html" },
  { name: "L'Oreal",          url: "https://hasaki.vn/thuong-hieu/l-oreal.html" },
];

// ── Tuỳ chỉnh tốc độ ──────────────────────────────────────────────────────
const CONCURRENCY   = 3;    // số brand crawl đồng thời
const PAGE_DELAY_MS = 800;  // delay giữa các lần click "Xem thêm" / next page
const SCROLL_STEP   = 400;  // px mỗi bước scroll
const SCROLL_DELAY  = 100;  // ms giữa mỗi bước scroll
const HEADLESS      = true;

// ─── HELPERS ───────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(brand, msg) {
  console.log(`[${new Date().toLocaleTimeString("vi-VN")}] [${brand}] ${msg}`);
}

function parsePrice(str) {
  if (!str) return null;
  const num = str.replace(/[^\d]/g, "");
  return num ? parseInt(num, 10) : null;
}

// ─── SCROLL + FORCE LOAD ẢNH ──────────────────────────────────────────────
// Hasaki dùng loading="lazy" (native browser lazy load)
// Puppeteer headless không tự trigger khi scroll bằng JS
// → Phải force tất cả img lazy thành eager rồi đợi load xong

async function scrollAndLoadImages(page) {
  // Bước 1: Scroll xuống hết trang để browser biết vị trí các element
  await page.evaluate(async (step, delay) => {
    await new Promise((resolve) => {
      let pos = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        pos += step;
        if (pos >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, delay);
    });
  }, SCROLL_STEP, SCROLL_DELAY);

  // Bước 2: Force tất cả img[loading="lazy"] load ngay lập tức
  // Đây là fix chính — Hasaki không dùng data-src mà dùng native lazy loading
  await page.evaluate(async () => {
    const lazyImgs = [...document.querySelectorAll('img[loading="lazy"]')];

    // Đổi tất cả sang eager để browser load ngay
    lazyImgs.forEach(img => {
      img.loading = "eager";
      // Gán lại src để trigger load
      const currentSrc = img.getAttribute("src");
      if (currentSrc) img.src = currentSrc;
    });

    // Đợi tất cả ảnh load xong
    await Promise.all(
      lazyImgs.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(resolve => {
          img.onload  = resolve;
          img.onerror = resolve; // resolve cả khi lỗi, không block
        });
      })
    );
  });

  // Buffer nhỏ để DOM ổn định
  await sleep(500);
}

// ─── EXTRACT products từ DOM hiện tại ─────────────────────────────────────

async function extractProducts(page) {
  return page.evaluate(() => {
    const results = [];

    // ── Selector ưu tiên: card dạng Hasaki mới (Tailwind classes) ─────────
    let cards = [...document.querySelectorAll("div.rounded-xl.bg-card")];

    // ── Fallback: các dạng card khác ──────────────────────────────────────
    if (cards.length === 0) {
      cards = [
        ...document.querySelectorAll(
          ".product-item, .item-product, [class*='ProductCard'], " +
          "[class*='product_item'], .ghtk-product-item, " +
          "li.item, div[data-product-id]"
        ),
      ];
    }

    // ── Fallback cuối: anchor → /san-pham/ ────────────────────────────────
    if (cards.length === 0) {
      const anchors = [...document.querySelectorAll("a[href*='/san-pham/']")];
      const seen = new Set();
      anchors.forEach((a) => {
        const container =
          a.closest("li, article, [class*='item'], [class*='card']") || a;
        if (!seen.has(container)) {
          seen.add(container);
          cards.push(container);
        }
      });
    }

    cards.forEach((card) => {
      try {
        // URL
        const linkEl =
          card.querySelector("a[href*='/san-pham/']") ||
          (card.tagName === "A" && card.href.includes("/san-pham/") ? card : null);
        const href = linkEl ? linkEl.getAttribute("href") : "";
        const url = href
          ? href.startsWith("http") ? href : `https://hasaki.vn${href}`
          : "";

        // SKU từ URL
        const skuMatch = url.match(/san-pham\/(.+?)\.html/);
        const sku = skuMatch ? skuMatch[1] : "";

        // Tên
        const nameEl = card.querySelector("h2, h3, [class*='name'], [class*='title'], a[title]");
        const name = nameEl
          ? (nameEl.getAttribute("title") || nameEl.innerText || "").trim()
          : "";

        // ✅ FIX v3: Hasaki dùng loading="lazy" (native), KHÔNG có data-src
        // Sau khi force load ở scrollAndLoadImages(), img.src đã là URL thật
        const imgEl = card.querySelector("img");
        const rawSrc = imgEl?.src || imgEl?.getAttribute("src") || "";
        const imageUrl = rawSrc.startsWith("http") ? rawSrc : "";

        // Giá hiện tại
        const priceEl =
          card.querySelector("span.text-orange.font-bold") ||
          card.querySelector("[class*='price-now'], [class*='current-price'], .box_price_price");
        const price = parsePrice(priceEl?.innerText);

        // Giá gốc
        const oldPriceEl =
          card.querySelector("span.line-through") ||
          card.querySelector("del, s, [class*='original'], [class*='old-price']");
        const originalPrice = parsePrice(oldPriceEl?.innerText);

        const discountPercent =
          originalPrice && price && originalPrice > price
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : null;

        // Rating
        let rating = null;
        const ratingEl = card.querySelector(
          "[class*='rating'], .rate_average, [data-score], [class*='star']"
        );
        if (ratingEl) {
          const ds = parseFloat(ratingEl.getAttribute("data-score") || "");
          if (!isNaN(ds) && ds <= 5) {
            rating = ds;
          } else {
            const bar = ratingEl.querySelector("[style*='width']");
            if (bar) {
              const m = (bar.getAttribute("style") || "").match(/width\s*:\s*([\d.]+)%/);
              if (m) rating = Math.round((parseFloat(m[1]) / 20) * 10) / 10;
            }
          }
          if (rating === null) {
            const m2 = (ratingEl.innerText || "").match(/^(\d(?:[.,]\d)?)\b/);
            if (m2) {
              const v = parseFloat(m2[1].replace(",", "."));
              if (!isNaN(v) && v <= 5) rating = v;
            }
          }
        }

        // Số lượt đánh giá
        let reviewCount = null;
        const reviewEl = card.querySelector(
          "[class*='review'], [class*='count_gg'], [class*='rating-count']"
        );
        if (reviewEl) {
          const m = reviewEl.innerText.match(/\d+/);
          if (m) reviewCount = parseInt(m[0], 10);
        }
        if (reviewCount === null) {
          const m2 = (card.innerText || "").match(/\((\d+)\)/g);
          if (m2) {
            reviewCount = parseInt(m2[m2.length - 1].replace(/\D/g, ""), 10) || null;
          }
        }

        // Badge khuyến mãi
        const badgeEl = card.querySelector(
          "[class*='badge'], [class*='label'], [class*='tag'], [class*='promo']"
        );
        const badge = badgeEl ? badgeEl.innerText.trim() : "";

        if (name || url) {
          results.push({
            name, sku, url,
            image: imageUrl,
            price, original_price: originalPrice,
            discount_percent: discountPercent,
            rating, review_count: reviewCount,
            badge,
          });
        }
      } catch (_) {}
    });

    return results;

    function parsePrice(str) {
      if (!str) return null;
      const n = str.replace(/[^\d]/g, "");
      return n ? parseInt(n, 10) : null;
    }
  });
}

// ─── CRAWL 1 brand (tất cả trang) ─────────────────────────────────────────

async function crawlBrand(browser, brand) {
  log(brand.name, "Bắt đầu...");
  const page = await browser.newPage();

  // Block font/media để tăng tốc — KHÔNG block image vì cần load ảnh thật
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["font", "media"].includes(req.resourceType())) req.abort();
    else req.continue();
  });

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1366, height: 768 });

  // Stealth nhẹ
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    window.chrome = { runtime: {} };
  });

  const allProducts = [];
  const seenUrls = new Set();
  let totalDeclared = null;

  const addNew = (batch) => {
    let added = 0;
    for (const p of batch) {
      const key = p.url || p.name;
      if (key && !seenUrls.has(key)) {
        seenUrls.add(key);
        allProducts.push(p);
        added++;
      }
    }
    return added;
  };

  try {
    await page.goto(brand.url, { waitUntil: "domcontentloaded", timeout: 40000 });

    await page
      .waitForSelector(
        "div.rounded-xl.bg-card, .product-item, a[href*='/san-pham/']",
        { timeout: 12000 }
      )
      .catch(() => log(brand.name, "⚠ Không tìm thấy selector chuẩn, thử fallback"));

    // Scroll + force load tất cả ảnh lazy
    await scrollAndLoadImages(page);

    // Đọc tổng số sản phẩm
    totalDeclared = await page.evaluate(() => {
      const text = document.body.innerText;
      const m = text.match(/(\d+)\s+(?:sản phẩm|kết quả)/i);
      return m ? parseInt(m[1], 10) : null;
    });
    if (totalDeclared) log(brand.name, `Tổng khai báo: ${totalDeclared} SP`);

    const first = await extractProducts(page);
    const added = addNew(first);
    log(brand.name, `Trang 1: +${added} SP (tổng: ${allProducts.length})`);

    // ── Phân trang / Load more ─────────────────────────────────────────────
    let noNewStreak = 0;
    let pageNum = 2;

    while (true) {
      if (totalDeclared && allProducts.length >= totalDeclared) {
        log(brand.name, `Đủ ${totalDeclared} SP — dừng.`);
        break;
      }

      const clicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button, a")]
          .find((el) => /xem thêm|load more|see more/i.test(el.innerText));
        if (btn && !btn.disabled) { btn.click(); return "load_more"; }

        const next = document.querySelector(
          ".pagination .next:not(.disabled), a[rel='next'], [aria-label='Next']"
        );
        if (next) { next.click(); return "next_page"; }
        return null;
      });

      if (!clicked) {
        log(brand.name, "Không còn trang tiếp theo.");
        break;
      }

      await sleep(PAGE_DELAY_MS);
      await page
        .waitForFunction(
          (prevCount) => document.querySelectorAll("a[href*='/san-pham/']").length > prevCount,
          { timeout: 8000 },
          seenUrls.size
        )
        .catch(() => {});

      // Scroll + force load ảnh trang mới
      await scrollAndLoadImages(page);

      const batch = await extractProducts(page);
      const newAdded = addNew(batch);
      log(brand.name, `Trang ${pageNum}: +${newAdded} SP (tổng: ${allProducts.length})`);

      if (newAdded === 0) {
        noNewStreak++;
        if (noNewStreak >= 2) {
          log(brand.name, "2 lần liên tiếp không có SP mới — dừng.");
          break;
        }
      } else {
        noNewStreak = 0;
      }

      pageNum++;
    }
  } catch (err) {
    log(brand.name, `❌ Lỗi: ${err.message}`);
  }

  await page.close();
  log(brand.name, `✅ Hoàn tất: ${allProducts.length} sản phẩm`);

  return {
    brand_url: brand.url,
    total_declared: totalDeclared,
    total_crawled: allProducts.length,
    products: allProducts,
  };
}

// ─── MAIN với concurrency ──────────────────────────────────────────────────

async function main() {
  console.log("🚀 Khởi động Hasaki crawler (v3 - native lazy load fix)...");
  console.log(`⚡ Concurrency: ${CONCURRENCY} brand đồng thời`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: { width: 1366, height: 768 },
  });

  const crawledAt = new Date().toISOString();
  const result = {
    crawled_at: crawledAt,
    source: "hasaki.vn",
    total_brands: BRANDS.length,
    total_products: 0,
    brands: {},
  };

  for (let i = 0; i < BRANDS.length; i += CONCURRENCY) {
    const chunk = BRANDS.slice(i, i + CONCURRENCY);
    console.log(`\n📦 Batch ${Math.floor(i / CONCURRENCY) + 1}: ${chunk.map((b) => b.name).join(", ")}`);

    const chunkResults = await Promise.all(
      chunk.map((brand) => crawlBrand(browser, brand))
    );

    chunk.forEach((brand, idx) => {
      result.brands[brand.name] = chunkResults[idx];
      result.total_products += chunkResults[idx].total_crawled || 0;
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf-8");
    console.log(`💾 Đã lưu checkpoint (${result.total_products} SP tổng cộng)`);
  }

  await browser.close();

  console.log(`\n✅ Xong! Tổng: ${result.total_products} sản phẩm từ ${result.total_brands} thương hiệu`);
  console.log(`📄 File: ${OUTPUT_FILE}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });