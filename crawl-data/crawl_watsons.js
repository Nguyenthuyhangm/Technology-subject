/**
 * Watsons VN Brand Product Crawler - Auto Handle Landing Pages
 * Usage: node crawl_watsons.js
 */

const puppeteer = require("puppeteer");
const fs = require("fs");

const BRANDS = [
  { name: "Acnes",          url: "https://www.watsons.vn/vi/all-brands/list/20002/acnes" },
  { name: "La Roche-Posay", url: "https://www.watsons.vn/vi/all-brands/b/20308/la-roche-posay" },
  { name: "Cocoon",         url: "https://www.watsons.vn/vi/all-brands/b/20680/cocoon" },
  { name: "Hada Labo",      url: "https://www.watsons.vn/vi/all-brands/list/20112/hada-labo" },
  { name: "Selsun",         url: "https://www.watsons.vn/vi/all-brands/list/20433/selsun" },
  { name: "Nivea",          url: "https://www.watsons.vn/vi/all-brands/list/20328" },
  { name: "Sunplay",        url: "https://www.watsons.vn/vi/all-brands/list/20228/sunplay" },
  { name: "Head & Shoulders", url: "https://www.watsons.vn/vi/all-brands/list/20514/head-shoulders" },
  { name: "Oxy",            url: "https://www.watsons.vn/vi/all-brands/list/20177/oxy" },
  { name: "Lifebuoy",       url: "https://www.watsons.vn/vi/all-brands/list/20450/lifebuoy" },
  { name: "Melano CC",      url: "https://www.watsons.vn/vi/all-brands/list/20148/melano-cc" },
  { name: "Lipice",         url: "https://www.watsons.vn/vi/all-brands/list/20141/lipice" },
  { name: "Tsubaki",        url: "https://www.watsons.vn/vi/all-brands/b/20510/tsubaki" },
  { name: "Enchanteur",     url: "https://www.watsons.vn/vi/all-brands/list/20091/enchanteur" },
  { name: "L'Oreal Paris",  url: "https://www.watsons.vn/vi/all-brands/b/20314/l-oreal-paris" }
];

const OUTPUT_FILE    = "watsons_full_data.json";
const MAX_PAGES      = 40;      
const PAGE_DELAY_MS  = 3500;    
const SCROLL_DELAY   = 1500;     

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

// ─── LẤY SẢN PHẨM ─────────────────────────────────────────────────────────

async function extractProductsFromDOM(page) {
  return page.evaluate(() => {
    const products = [];

    let cards = [...document.querySelectorAll(
      "wtc-product-grid-item, product-grid-item, wtc-product-tile, .productContainer, .product-item, e2-product-list li"
    )];

    if (cards.length === 0) {
      const anchors = [...document.querySelectorAll("a[href*='/p/BP_'], a[href*='/p/WP_']")];
      const seen = new Set();
      anchors.forEach((a) => {
        const container = a.closest("li, article, div[class*='item'], div[class*='card']") || a.parentElement;
        if (container && !seen.has(container)) {
          seen.add(container);
          cards.push(container);
        }
      });
    }

    cards.forEach((card) => {
      try {
        if (card.classList && card.classList.contains('custom-tile')) return;
        if (card.querySelector('.custom-tile')) return;

        const getText = (selector) => {
          const el = card.querySelector(selector);
          return el ? el.textContent.trim().replace(/\s+/g, ' ') : "";
        };

        const linkEl = card.querySelector("a.product-name, .product-img a, a[href*='/p/']") || 
                       (card.tagName === "A" && card.href.includes('/p/') ? card : null);
        let href = linkEl ? linkEl.getAttribute("href") : "";
        let productUrl = href ? (href.startsWith("http") ? href : `https://www.watsons.vn${href.startsWith("/") ? "" : "/"}${href}`) : "";
        const codeMatch = productUrl.match(/\/p\/((?:BP|WP)_\w+)/);
        const productCode = codeMatch ? codeMatch[1] : "";

        let name = getText(".productInfo .title, .title, .name, .product-name, [class*='productName'], h3");
        let brand = getText(".productInfo .brand, .brand, .product-brand, [class*='brandName']");

        const imgEls = [...card.querySelectorAll("img")];
        let image = "";
        let validImgEl = imgEls.find(img => {
            const alt = img.getAttribute("alt") || "";
            const src = img.getAttribute("src") || "";
            return !alt.includes("6.5") && !src.includes("6.5"); 
        });

        if (validImgEl) {
            image = validImgEl.getAttribute("src") || validImgEl.getAttribute("data-src") || "";
            if (image && !image.startsWith("http")) image = `https://www.watsons.vn${image}`;
            if (!name) name = (validImgEl.getAttribute("alt") || "").trim();
        }

        // --- CỤM XỬ LÝ GIÁ ĐÃ ĐƯỢC LÀM LẠI HOÀN TOÀN ---
        let price = null;
        let originalPrice = null;

        // 1. Cố gắng lấy giá Sale và Giá gốc bị gạch (Trường hợp có Sale)
        let markdownText = getText(".markdown-price, .currentPrice");
        let rrpText = getText(".rrp-price, del, s, .oldPrice");

        if (markdownText) price = parseInt(markdownText.replace(/[^\d]/g, ""), 10);
        if (rrpText) originalPrice = parseInt(rrpText.replace(/[^\d]/g, ""), 10);

        // 2. Nếu không có giá Sale, tìm giá Normal (.origin-price)
        if (!price || isNaN(price)) {
            let originText = getText(".origin-price");
            if (originText) price = parseInt(originText.replace(/[^\d]/g, ""), 10);
        }

        // 3. Fallback cuối cùng: Cào toàn bộ text trong khu vực giá và tự nội suy
        if (!price || isNaN(price)) {
            let allPriceText = getText(".productPrice, .price, .basic-price-group, .display-price-group");
            if (allPriceText) {
                // Rút hết các cụm số ra
                let numbers = allPriceText.match(/\d{1,3}(,\d{3})*(\.\d+)?/g);
                if (numbers && numbers.length > 0) {
                    let parsedNumbers = numbers.map(n => parseInt(n.replace(/[^\d]/g, ""), 10)).filter(n => !isNaN(n));
                    if (parsedNumbers.length === 1) {
                        price = parsedNumbers[0]; // Chỉ có 1 giá (Không sale)
                    } else if (parsedNumbers.length >= 2) {
                        originalPrice = Math.max(...parsedNumbers); // Giá cao hơn là giá gốc
                        price = Math.min(...parsedNumbers); // Giá thấp hơn là giá bán
                    }
                }
            }
        }

        // Dọn dẹp NaN
        if (isNaN(price)) price = null;
        if (isNaN(originalPrice)) originalPrice = null;
        
        // Nếu giá trị giống nhau thì xóa originalPrice đi (Không sale)
        if (price === originalPrice) originalPrice = null;

        let discountPercent = null;
        if (originalPrice && price && originalPrice > price) {
            discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
        }
        // --- KẾT THÚC CỤM XỬ LÝ GIÁ ---

        let reviewCount = null;
        const rateText = getText(".rate .text, wtc-review-summary, [class*='review']");
        if (rateText) {
            const rMatch = rateText.match(/\d+/);
            if (rMatch) reviewCount = parseInt(rMatch[0], 10);
        }

        if (name && productCode && name !== "6.5") {
          products.push({
            name, 
            brand, 
            product_code: productCode, 
            url: productUrl, 
            image,
            price, 
            original_price: originalPrice, 
            discount_percent: discountPercent,
            review_count: reviewCount
          });
        }
      } catch (_) { }
    });
    return products;
  });
}

// ─── SCROLL & CLICK ────────────────────────────────────────────────────────

async function scrollToBottom(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, 600);
        totalHeight += 600;
        if (totalHeight >= document.body.scrollHeight + 1000) {
          clearInterval(timer); resolve();
        }
      }, 150);
    });
  });
  await sleep(SCROLL_DELAY);
}

async function clickLoadMoreOrNextPage(page) {
  return page.evaluate(() => {
    // 1. Nút "Xem thêm"
    const loadMoreBtn = document.querySelector("button[class*='load-more'], .btn-load-more, show-more-button button");
    if (loadMoreBtn && !loadMoreBtn.disabled && loadMoreBtn.offsetParent !== null) {
      loadMoreBtn.click(); return "clicked_load_more";
    }
    // 2. Nút "Phân trang (Next)"
    const nextBtn = document.querySelector(".pagination .next:not(.disabled), a[rel='next']");
    if (nextBtn && nextBtn.offsetParent !== null) {
      nextBtn.click(); return "clicked_next";
    }
    return null;
  });
}

// ─── XỬ LÝ CHUYỂN HƯỚNG TỪ LANDING PAGE SANG DANH SÁCH ────────────────────

async function handleLandingPage(page) {
    // Kiểm tra xem có đang ở trang Brand Landing Template không
    const isLandingPage = await page.evaluate(() => {
        return !!document.querySelector('cx-page-layout.e2BrandLandingPageTemplate');
    });

    if (isLandingPage) {
        log(`  🔄 Detected Brand Landing Page. Bypassing to Shop All list...`);
        
        // Tìm đường link "Shop All" hoặc "Khám phá Thương hiệu"
        const targetUrl = await page.evaluate(() => {
            // Lấy link từ nút Shop All
            const shopAllBtn = document.querySelector('a.shop-all.button');
            if (shopAllBtn) return shopAllBtn.href;

            // Lấy link từ header Khám phá Thương hiệu
            const exploreBtn = document.querySelector('.brandLink-btn a');
            if (exploreBtn) return exploreBtn.href;

            return null;
        });

        if (targetUrl) {
            log(`  🔗 Redirecting to: ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
            await sleep(4000); // Chờ trang mới tải JS
            return true;
        } else {
            log(`  ⚠️ Could not find "Shop All" button. Will try to crawl current page.`);
        }
    }
    return false;
}

// ─── MAIN CRAWL LOGIC ──────────────────────────────────────────────────────

async function crawlBrand(browser, brand) {
  log(`\n🏷️  Crawling: ${brand.name}`);
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["font", "media"].includes(req.resourceType())) req.abort();
    else req.continue();
  });

  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36");
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto(brand.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(4000); 

    // Kiểm tra và bypass Landing Page nếu cần
    await handleLandingPage(page);

    await scrollToBottom(page);
    await sleep(2000);
  } catch (err) {
    log(`  ❌ Failed load: ${err.message}`);
    await page.close();
    return { total_crawled: 0, products: [] };
  }

  const allProducts = [];
  const seenCodes = new Set();
  let attempts = 0, noNewCount = 0;

  while (attempts < MAX_PAGES) {
    const batch = await extractProductsFromDOM(page);
    let added = 0;
    for (const p of batch) {
      const key = p.product_code || p.url;
      if (key && !seenCodes.has(key)) {
        seenCodes.add(key); allProducts.push(p); added++;
      }
    }
    
    log(`  ✅ Page/Scroll ${attempts + 1}: +${added} products (Total: ${allProducts.length})`);

    const action = await clickLoadMoreOrNextPage(page);
    if (!action) {
        log(`  🏁 No more pages/Load More button found. Stopping.`);
        break;
    }

    await sleep(PAGE_DELAY_MS);
    await scrollToBottom(page);
    attempts++;
    
    if (added === 0) {
      noNewCount++;
      if (noNewCount >= 3) break; 
    } else noNewCount = 0;
  }

  await page.close();
  log(`  🎉 Finished ${brand.name}: ${allProducts.length} products`);
  return { total_crawled: allProducts.length, products: allProducts };
}

async function main() {
  log("🚀 Starting Watsons VN crawler...");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const result = { crawled_at: new Date().toISOString(), total_products: 0, brands: {} };

  for (const brand of BRANDS) {
    result.brands[brand.name] = await crawlBrand(browser, brand);
    result.total_products += result.brands[brand.name].total_crawled || 0;
    await sleep(3000);
  }

  await browser.close();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf-8");
  log(`\n✅ Done! Data saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);