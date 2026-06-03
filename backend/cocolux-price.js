/**
 * Cocolux Price Crawler - Puppeteer
 * Usage: node cocolux-price.js <productUrl>
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

process.on('unhandledRejection', (err) => {
    console.log(JSON.stringify({ error: true, message: err && err.message ? err.message : String(err) }));
    process.exit(1);
});
process.on('uncaughtException', (err) => {
    console.log(JSON.stringify({ error: true, message: err && err.message ? err.message : String(err) }));
    process.exit(1);
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const productUrl = process.argv[2];

const resolveChromeExecutable = () => {
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        process.env.CHROME_PATH,
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/opt/google/chrome/chrome'
    ];

    for (const p of candidates) {
        if (p && fs.existsSync(p)) {
            return p;
        }
    }

    return null;
};

if (!productUrl) {
    console.log(JSON.stringify({ error: true, message: 'productUrl is required' }));
    process.exit(1);
}

(async () => {
    let browser = null;
    try {
        const executablePath = resolveChromeExecutable();
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: executablePath || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });

    } catch (err) {
        console.log(JSON.stringify({ error: true, message: 'Failed to launch browser: ' + (err && err.message ? err.message : String(err)) }));
        process.exit(1);
    }

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(1000);

        // Extract ProductId và FinalPrice từ hidden inputs
        const productId = await page.$eval('#ProductId', el => el.value).catch(() => null);
        const finalPriceStr = await page.$eval('#FinalPrice', el => el.value).catch(() => null);

        if (!productId) {
            await browser.close();
            console.log(JSON.stringify({ error: true, message: 'Cannot extract ProductId from Cocolux page: ' + productUrl }));
            process.exit(1);
        }

        const finalPrice = finalPriceStr ? parseInt(finalPriceStr.replace(/[^\d]/g, ''), 10) : null;

        if (!finalPrice || finalPrice <= 0) {
            await browser.close();
            console.log(JSON.stringify({ error: true, message: 'Cannot extract FinalPrice from Cocolux page: ' + productUrl }));
            process.exit(1);
        }

        // Gọi API groupproducts để lấy originalPrice và stock
        let originalPrice = null;
        let inStock = true;

        try {
            const apiUrl = `https://cocolux.com/api/GetData/groupproducts?contentId=${productId}`;
            const apiResponse = await page.evaluate(async (url) => {
                const res = await fetch(url, {
                    headers: { 'Accept': 'application/json', 'Referer': 'https://cocolux.com/' }
                });
                return res.ok ? res.text() : null;
            }, apiUrl);

            if (apiResponse) {
                const data = JSON.parse(apiResponse);
                if (Array.isArray(data) && data.length > 0) {
                    // Tìm item hiện tại theo productId
                    const current = data.find(item => String(item.id) === String(productId)) || data[0];
                    if (current) {
                        inStock = current.totalStock > 0;
                        // originalPrice = giá gốc trước giảm
                        if (current.price && current.price > finalPrice) {
                            originalPrice = current.price;
                        } else if (current.priceOld && current.priceOld > finalPrice) {
                            originalPrice = current.priceOld;
                        }
                    }
                }
            }
        } catch (e) {
            // API fail → dùng data từ HTML
        }

        await browser.close();

        const discountPct = (originalPrice && originalPrice > finalPrice)
            ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
            : null;

        console.log(JSON.stringify({
            price: finalPrice,
            originalPrice: originalPrice,
            discountPct: discountPct,
            inStock: inStock,
            crawledAt: new Date().toISOString()
        }));

    } catch (err) {
        try { await browser.close(); } catch(e) {}
        console.log(JSON.stringify({ error: true, message: err.message }));
        process.exit(1);
    }
})();