/**
 * Cocolux Brand Product Crawler
 * Usage: node crawl_cocolux.js
 * Output: cocolux_full_data.json
 *
 * Requires: npm install puppeteer axios cheerio
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// ─── CONFIG ────────────────────────────────────────────────────────────────

const BRANDS = [
  { name: "Acnes",         url: "https://cocolux.com/thuong-hieu/acnes-i.208",             id: 208 },
  { name: "La Roche-Posay",url: "https://cocolux.com/thuong-hieu/la-roche-posay-i.100",    id: 100 },
  { name: "Cocoon",        url: "https://cocolux.com/thuong-hieu/cocoon-i.125",             id: 125 },
  { name: "Hada Labo",     url: "https://cocolux.com/thuong-hieu/hada-labo-i.185",          id: 185 },
  { name: "Selsun",        url: "https://cocolux.com/thuong-hieu/selsun-i.576",             id: 576 },
  { name: "Nivea",         url: "https://cocolux.com/thuong-hieu/nivea-i.54",               id: 54  },
  { name: "Sunplay",       url: "https://cocolux.com/thuong-hieu/sunplay-i.202",            id: 202 },
  { name: "Rohto",         url: "https://cocolux.com/thuong-hieu/rohto-i.264",              id: 264 },
  { name: "Lipice",        url: "https://cocolux.com/thuong-hieu/lipice-i.203",             id: 203 },
  { name: "Tsubaki",       url: "https://cocolux.com/thuong-hieu/tsubaki-i.621",            id: 621 },
  { name: "L'Oreal",       url: "https://cocolux.com/thuong-hieu/loreal-i.276",             id: 276 },
];

const OUTPUT_FILE   = "cocolux_full_data.json";
const PRODUCTS_PER_PAGE = 20;           // cocolux default page size
const MAX_PAGES_PER_BRAND = 50;         // safety cap
const DELAY_MS      = 1200;             // polite delay between page loads
const HEADLESS      = true;

// ─── HELPERS ───────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

/**
 * Intercept the JSON API response that cocolux fires when the brand page loads.
 * cocolux calls something like:
 *   GET https://api.cocolux.com/api/v2/items?...&brand_id=208&page=1&limit=20
 *
 * We capture it via Network interception so we get clean structured data
 * even though the front-end is server-side rendered / JS-hydrated.
 */
async function fetchBrandProductsViaAPI(page, brandId, brandName, pageNum) {
  return new Promise(async (resolve, reject) => {
    const collectedData = [];
    let resolved = false;

    // Listen for API responses
    const responseHandler = async (response) => {
      const url = response.url();
      // Match the internal items/products API
      if (
        (url.includes("/api/") || url.includes("api.cocolux.com")) &&
        (url.includes("items") || url.includes("products")) &&
        url.includes(`${brandId}`)
      ) {
        try {
          const json = await response.json();
          collectedData.push(json);
        } catch (_) {}
      }
    };

    page.on("response", responseHandler);

    // Build paginated URL – cocolux uses ?page= or ?offset= query params
    const pageUrl = `https://cocolux.com/thuong-hieu/${slugFromBrand(brandName)}-i.${brandId}?page=${pageNum}`;
    log(`  → Navigating: ${pageUrl}`);

    try {
      await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 30000 });
      // Extra wait for lazy JS
      await sleep(1500);

      // Try to parse products directly from the DOM if API was not intercepted
      const domProducts = await extractProductsFromDOM(page);

      page.off("response", responseHandler);

      if (!resolved) {
        resolved = true;
        resolve({ apiData: collectedData, domProducts });
      }
    } catch (err) {
      page.off("response", responseHandler);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    }
  });
}

/** Derive url slug from brand name */
function slugFromBrand(brandName) {
  const map = {
    "Acnes":          "acnes",
    "La Roche-Posay": "la-roche-posay",
    "Cocoon":         "cocoon",
    "Hada Labo":      "hada-labo",
    "Selsun":         "selsun",
    "Nivea":          "nivea",
    "Sunplay":        "sunplay",
    "Rohto":          "rohto",
    "Lipice":         "lipice",
    "Tsubaki":        "tsubaki",
    "L'Oreal":        "loreal",
  };
  return map[brandName] || brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Extract product cards directly from rendered HTML */
/** Extract product cards directly from rendered HTML */
async function extractProductsFromDOM(page) {
  return await page.evaluate(() => {
    const products = [];
    // Nhắm vào tất cả các thẻ có khả năng là card sản phẩm
    const cards = document.querySelectorAll(
      ".product-card, .item-product, [class*='product-item'], .col-product"
    );

    cards.forEach((card) => {
      try {
        // 1. Tên sản phẩm
        const nameEl = card.querySelector(".product-name, [class*='name'], h3, a[title]");
        const name = nameEl ? (nameEl.getAttribute("title") || nameEl.innerText || "").trim() : "";

        // 2. XỬ LÝ GIÁ - Dùng Regex để tách chuỗi số dài (Fix lỗi 369000410000)
        let price = null;
        let originalPrice = null;

        // Lấy toàn bộ text trong thẻ chứa giá (thường là .price hoặc .price-main)
        const priceContainer = card.querySelector(".price, [class*='price'], .cost");
        
        if (priceContainer) {
          // Lấy text, xóa bỏ dấu chấm, dấu phẩy và chữ đ
          const rawText = priceContainer.innerText.replace(/[.,đ\s]/g, ""); 
          // Tìm tất cả các cụm số có độ dài từ 4-7 chữ số (giá mỹ phẩm thường trong khoảng này)
          const matches = rawText.match(/\d{4,7}/g);

          if (matches && matches.length >= 1) {
            price = parseInt(matches[0], 10); // Số đầu tiên luôn là giá bán hiện tại
            if (matches.length >= 2) {
              originalPrice = parseInt(matches[1], 10); // Số thứ hai (nếu có) là giá gốc
            }
          }
        }

        // 3. XỬ LÝ ẢNH - Loại bỏ ảnh khung (khung-vuong, frame...)
        const imgEls = card.querySelectorAll("img");
        let image = "";
        for (let img of imgEls) {
          const src = img.getAttribute("data-src") || img.getAttribute("src") || "";
          // Nếu link ảnh KHÔNG chứa các từ khóa liên quan đến khung trang trí thì mới lấy
          if (src && !src.includes("frame") && !src.includes("khung-vuong") && !src.includes(".webp")) {
             image = src;
             if (image) break;
          }
          // Fallback nếu không lọc được thì lấy cái có data-src (thường là ảnh thật)
          if (img.getAttribute("data-src")) {
            image = img.getAttribute("data-src");
            break;
          }
        }

        // 4. URL & SKU
        const linkEl = card.querySelector("a");
        const productUrl = linkEl ? linkEl.href : "";
        const skuMatch = productUrl.match(/i\.(\d+)/);
        const sku = skuMatch ? skuMatch[1] : "";

        if (name && price) {
          products.push({
            name,
            price,
            original_price: originalPrice,
            discount_percent: (originalPrice && price && originalPrice > price)
              ? Math.round(((originalPrice - price) / originalPrice) * 100)
              : null,
            image: image ? (image.startsWith("http") ? image : `https://cocolux.com${image}`) : "",
            url: productUrl,
            sku
          });
        }
      } catch (e) {}
    });
    return products;
  });
}
/** Check if there is a next page button / more products */
async function hasNextPage(page) {
  return await page.evaluate(() => {
    // Look for pagination next button
    const nextBtn = document.querySelector(
      ".pagination .next:not(.disabled), [aria-label='Next'], [class*='next-page']:not([disabled]), .btn-load-more:not([disabled])"
    );
    if (nextBtn) return true;

    // Also check if a "load more" button exists and is active
    const loadMore = document.querySelector("[class*='load-more'], [class*='LoadMore']");
    if (loadMore && !loadMore.disabled) return true;

    return false;
  });
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  log("🚀 Starting Cocolux crawler...");
  log(`📋 Brands to crawl: ${BRANDS.map((b) => b.name).join(", ")}`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,900",
    ],
  });

  const allData = {};
  const crawledAt = new Date().toISOString();

  for (const brand of BRANDS) {
    log(`\n🏷️  Crawling brand: ${brand.name} (id=${brand.id})`);
    const page = await browser.newPage();

    // Block heavy resources to speed up crawling
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["font", "media"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 900 });

    const brandProducts = [];
    let pageNum = 1;
    let consecutiveEmpty = 0;

    while (pageNum <= MAX_PAGES_PER_BRAND) {
      log(`  📄 Page ${pageNum}...`);

      try {
        const { domProducts } = await fetchBrandProductsViaAPI(
          page,
          brand.id,
          brand.name,
          pageNum
        );

        if (domProducts.length === 0) {
          consecutiveEmpty++;
          log(`  ⚠️  No products found on page ${pageNum}.`);
          if (consecutiveEmpty >= 2) {
            log(`  ✋ Stopping — 2 consecutive empty pages.`);
            break;
          }
        } else {
          consecutiveEmpty = 0;
          // Deduplicate by URL
          const existingUrls = new Set(brandProducts.map((p) => p.url));
          const newProds = domProducts.filter(
            (p) => p.url && !existingUrls.has(p.url)
          );
          brandProducts.push(...newProds);
          log(`  ✅ Found ${newProds.length} new products (total: ${brandProducts.length})`);
        }

        // Check if pagination continues
        const more = await hasNextPage(page);
        if (!more && pageNum > 1) {
          log(`  🏁 No more pages for ${brand.name}.`);
          break;
        }

        pageNum++;
        await sleep(DELAY_MS);
      } catch (err) {
        log(`  ❌ Error on page ${pageNum}: ${err.message}`);
        consecutiveEmpty++;
        if (consecutiveEmpty >= 3) break;
        pageNum++;
        await sleep(DELAY_MS * 2);
      }
    }

    await page.close();

    allData[brand.name] = {
      brand_id: brand.id,
      brand_url: brand.url,
      crawled_at: crawledAt,
      total_products: brandProducts.length,
      products: brandProducts,
    };

    log(`  🎉 ${brand.name}: ${brandProducts.length} products saved.`);
    await sleep(DELAY_MS);
  }

  await browser.close();

  // ── Write output ───────────────────────────────────────────────────────
  const output = {
    crawled_at: crawledAt,
    total_brands: BRANDS.length,
    total_products: Object.values(allData).reduce(
      (sum, b) => sum + b.total_products,
      0
    ),
    brands: allData,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  log(`\n✅ Done! Saved to ${OUTPUT_FILE}`);
  log(`   Brands   : ${output.total_brands}`);
  log(`   Products : ${output.total_products}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});