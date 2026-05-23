/**
 * Watsons Price Crawler
 * Usage: node watsons-price.js <productUrl>
 */

const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const productUrl = process.argv[2];

if (!productUrl) {
    console.log(JSON.stringify({ error: true, message: 'productUrl is required' }));
    process.exit(1);
}

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const page = await browser.newPage();

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            window.chrome = { runtime: {} };
        });

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        );

        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);

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

            const inStock = !document.body.innerText.toLowerCase().includes('hết hàng');
            const discountPct = (originalPrice && price && originalPrice > price)
                ? Math.round(((originalPrice - price) / originalPrice) * 100)
                : null;

            return { price, originalPrice, discountPct, inStock };
        });

        await browser.close();

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
        await browser.close();
        console.log(JSON.stringify({ error: true, message: err.message }));
        process.exit(1);
    }
})();