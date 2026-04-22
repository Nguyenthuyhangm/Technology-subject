import { closeBrowserSession, createBrowserSession } from '../core/browser';
import { env } from '../config/env';

type PriceSnapshotOutput = {
    price: number | null;
    originalPrice: number | null;
    discountPct: number | null;
    inStock: boolean;
    crawledAt: string;
};

function parsePrice(text?: string | null): number | null {
    if (!text) return null;

    const cleaned = text.replace(/[^\d]/g, '');
    if (!cleaned) return null;

    return Number(cleaned);
}

function printJsonAndExit(payload: unknown, exitCode = 0): never {
    process.stdout.write(JSON.stringify(payload));
    process.exit(exitCode);
}

async function main(): Promise<void> {
    const rawUrl = process.argv[2];

    if (!rawUrl) {
        printJsonAndExit(
            {
                error: 'MISSING_URL',
                message:
                    'Usage: npx tsx src/main/refresh-price-guardian.ts "<GUARDIAN_PRODUCT_URL>"',
            },
            1
        );
    }

    let session: Awaited<ReturnType<typeof createBrowserSession>> | undefined;

    try {
        session = await createBrowserSession({ blockAssets: true });
        const page = session.page;

        await page.goto(rawUrl, {
            waitUntil: 'domcontentloaded',
            timeout: env.requestTimeoutMs,
        });

        await page.waitForSelector('h1', { timeout: 10000 });

        await page.evaluate(() => window.scrollTo(0, 600)).catch(() => undefined);
        await page.waitForTimeout(800);

        const priceText = await page
            .locator('.price')
            .first()
            .textContent()
            .catch(() => null);

        const oldPriceText = await page
            .locator('.old-price .price')
            .first()
            .textContent()
            .catch(() => null);

        const stockText = await page
            .locator('.stock')
            .first()
            .textContent()
            .catch(() => null);

        const price = parsePrice(priceText);
        const originalPrice = parsePrice(oldPriceText);

        let discountPct: number | null = null;

        if (price && originalPrice && originalPrice > price) {
            discountPct = Number(
                (((originalPrice - price) / originalPrice) * 100).toFixed(2)
            );
        }

        const inStock =
            stockText?.toLowerCase().includes('còn') ||
            stockText?.toLowerCase().includes('in stock') ||
            false;

        const payload: PriceSnapshotOutput = {
            price,
            originalPrice,
            discountPct,
            inStock,
            crawledAt: new Date().toISOString(),
        };

        printJsonAndExit(payload, 0);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        printJsonAndExit(
            {
                error: 'CRAWL_FAILED',
                message,
            },
            2
        );
    } finally {
        await closeBrowserSession(session).catch(() => undefined);
    }
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);

    printJsonAndExit(
        {
            error: 'UNHANDLED_ERROR',
            message,
        },
        99
    );
});