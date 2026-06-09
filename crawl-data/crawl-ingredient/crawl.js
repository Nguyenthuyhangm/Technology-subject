import { chromium } from "playwright";
import fs from "fs";

const INPUT_FILE = "canonical-products.json";
const OUTPUT_FILE = "ingredients.json";

function loadProducts() {
    const raw = JSON.parse(
        fs.readFileSync(INPUT_FILE, "utf8")
    );

    return Object.values(raw).flat();
}

function loadExistingResults() {
    if (!fs.existsSync(OUTPUT_FILE)) {
        return [];
    }

    return JSON.parse(
        fs.readFileSync(OUTPUT_FILE, "utf8")
    );
}

function saveResults(results) {
    fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(results, null, 2),
        "utf8"
    );
}

async function extractIngredients(page) {

    return await page.evaluate(() => {

        const headings = [
            ...document.querySelectorAll(
                "h1,h2,h3,h4"
            )
        ];

        const overview = headings.find(
            el =>
                el.textContent
                    ?.trim()
                    .toLowerCase()
                    .includes(
                        "ingredients overview"
                    )
        );

        if (!overview) {
            return [];
        }

        let node = overview.nextElementSibling;

        let text = "";

        while (node) {

            const currentText =
                node.textContent?.trim() || "";

            if (
                currentText
                    .toLowerCase()
                    .includes("highlights")
            ) {
                break;
            }

            text += " " + currentText;

            node =
                node.nextElementSibling;
        }

        text = text
            .replace(/Warning:.*/i, "")
            .replace(/\s+/g, " ")
            .trim();

        return text
            .split(",")
            .map(x => x.trim())
            .filter(Boolean);
    });
}

async function crawlProduct(page, product) {

    const keyword =
        product.canonical_name;

    try {

        console.log(
            `Searching: ${keyword}`
        );

        await page.goto(
            `https://incidecoder.com/search?query=${encodeURIComponent(keyword)}`,
            {
                waitUntil:
                    "domcontentloaded",
                timeout: 30000
            }
        );

        const firstResult =
            page.locator(
                'a[href*="/products/"]'
            ).first();

        if (
            await firstResult.count() === 0
        ) {

            return {
                id: product.id,
                productName: keyword,
                ingredients: [],
                found: false
            };
        }

        const href =
            await firstResult.getAttribute(
                "href"
            );

        await page.goto(
            `https://incidecoder.com${href}`,
            {
                waitUntil:
                    "domcontentloaded",
                timeout: 30000
            }
        );

        const productName =
            (
                await page
                    .locator("h1")
                    .first()
                    .textContent()
            )?.trim() || keyword;

        const ingredients =
            await extractIngredients(
                page
            );

        return {
            id: product.id,
            productName,
            ingredients,
            found: true
        };

    } catch (error) {

        return {
            id: product.id,
            productName: keyword,
            ingredients: [],
            found: false,
            error: error.message
        };
    }
}
async function worker(browser, products, results) {

    const page = await browser.newPage();

    while (products.length > 0) {

        const product = products.shift();

        if (!product) {
            break;
        }

        console.log(
            `[${product.canonical_name}]`
        );

        const result =
            await crawlProduct(
                page,
                product
            );

        if (result) {

            results.push(result);

            saveResults(results);
        }

        await page.waitForTimeout(
            1000
        );
    }

    await page.close();
}async function main() {

    const products =
        loadProducts();

    const existing =
        loadExistingResults();

    const processedIds =
        new Set(
            existing.map(
                x => x.id
            )
        );

    const queue =
        products.filter(
            p =>
                !processedIds.has(
                    p.id
                )
        );

    const results =
        [...existing];

    console.log(
        `Need crawl: ${queue.length}`
    );

    const browser1 =
        await chromium.launch({
            headless: true
        });

    const browser2 =
        await chromium.launch({
            headless: true
        });

    const browser3 =
        await chromium.launch({
            headless: true
        });

    await Promise.all([
        worker(
            browser1,
            queue,
            results
        ),
        worker(
            browser2,
            queue,
            results
        ),
        worker(
            browser3,
            queue,
            results
        )
    ]);

    await browser1.close();
    await browser2.close();
    await browser3.close();

    console.log(
        `DONE: ${results.length}`
    );
}

main();

main();