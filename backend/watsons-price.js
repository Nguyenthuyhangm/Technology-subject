/**
 * Watsons Price Crawler - Anti-bot bypass
 * Usage: node watsons-price.js <productUrl>
 */

const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const productUrl = process.argv[2];

if (!productUrl) {
    console.log(JSON.stringify({ error: true, message: 'productUrl is required' }));
    process.exit(1);
}

// Rotate user agents
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
];

const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
const randomDelay = () => Math.floor(Math.random() * 2000) + 1000; // 1-3s random

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080'
        ]
    });

    try {
        const page = await browser.newPage();

        // Anti-bot: giả browser thật
        await page.evaluateOnNewDocument(() => {
            // Xóa dấu hiệu webdriver
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            
            // Giả Chrome thật
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
            };

            // Giả plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            // Giả languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['vi-VN', 'vi', 'en-US', 'en']
            });
        });

        // Random user agent
        await page.setUserAgent(randomUA());

        // Set viewport giống browser thật
        await page.setViewport({ width: 1920, height: 1080 });

        // Set extra headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Upgrade-Insecure-Requests': '1'
        });

        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Random delay trước khi vào trang
        await sleep(randomDelay());

        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Random delay sau khi load
        await sleep(randomDelay());

        // Giả scroll như người thật
        await page.evaluate(() => {
            window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
        });

        await sleep(500);

        const result = await page.evaluate(() => {
            const getText = (selector) => {
                const el = document.querySelector(selector);
                return el ? el.textContent.trim().replace(/\s+/g, ' ') : null;
            };

            const parsePrice = (text) => {
                if (!text) return null;
                const digits = text.replace(/[^\d]/g, '');
                const val = parseInt(digits, 10);
                return val > 1000 ? val : null;
            };

            let price = parsePrice(getText('.markdown-price')) || parsePrice(getText('.currentPrice'));
            let originalPrice = parsePrice(getText('.rrp-price')) || parsePrice(getText('del')) ||
                                parsePrice(getText('s')) || parsePrice(getText('.oldPrice'));

            if (!price) price = parsePrice(getText('.origin-price'));

            if (!price) {
                const allPriceText = getText('.productPrice') || getText('.price') ||
                                     getText('.basic-price-group') || getText('.display-price-group');
                if (allPriceText) {
                    const numbers = allPriceText.match(/\d{1,3}(?:[,.]\d{3})+|\d{4,}/g);
                    if (numbers) {
                        const parsed = numbers.map(n => parseInt(n.replace(/[^\d]/g, ''), 10))
                                              .filter(n => n > 1000);
                        if (parsed.length === 1) price = parsed[0];
                        else if (parsed.length >= 2) {
                            price = Math.min(...parsed);
                            originalPrice = Math.max(...parsed);
                            if (price === originalPrice) originalPrice = null;
                        }
                    }
                }
            }

            // Kiểm tra URL có đúng trang sản phẩm không
            const url = window.location.href;
            const isProductPage = url.includes('/p/BP_') || url.includes('/p/WP_');

            const inStock = !document.body.innerText.toLowerCase().includes('hết hàng');
            const discountPct = (originalPrice && price && originalPrice > price)
                ? Math.round(((originalPrice - price) / originalPrice) * 100)
                : null;

            return { price, originalPrice, discountPct, inStock, isProductPage, currentUrl: url };
        });

        await browser.close();

        // Validate: bị redirect khỏi trang sản phẩm
        if (!result.isProductPage) {
            console.log(JSON.stringify({ 
                error: true, 
                message: 'Redirected away from product page: ' + result.currentUrl 
            }));
            process.exit(1);
        }

        // Validate: giá bất thường > 1,000,000 cho sản phẩm thường
        if (!result.price) {
            console.log(JSON.stringify({ error: true, message: 'Cannot extract price' }));
            process.exit(1);
        }

        console.log(JSON.stringify({
            price: result.price,
            originalPrice: result.originalPrice,
            discountPct: result.discountPct,
            inStock: result.inStock,
            crawledAt: new Date().toISOString()
        }));

    } catch (err) {
        try { await browser.close(); } catch(e) {}
        console.log(JSON.stringify({ error: true, message: err.message }));
        process.exit(1);
    }
})();