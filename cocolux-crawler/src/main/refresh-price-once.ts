import { closeBrowserSession, createBrowserSession } from '../core/browser';
import { env } from '../config/env';
import { extractProductDetail } from '../extractors/detail.extractor';

type PriceSnapshotOutput = {
  price: number | null;
  originalPrice: number | null;
  discountPct: number | null;
  inStock: boolean;
  crawledAt: string;
};

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
        message: 'Usage: npx tsx src/main/refresh-price-once.ts "<COCOLUX_PRODUCT_URL>"',
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

    await page.waitForSelector('h1, .title-product', { timeout: 10000 }).catch(() => undefined);
    await page.evaluate(() => window.scrollTo(0, 600)).catch(() => undefined);
    await page.waitForTimeout(800);

    const detail = await extractProductDetail(page, env.baseUrl);

    const payload: PriceSnapshotOutput = {
      price: detail.price ?? null,
      originalPrice: detail.originalPrice ?? null,
      discountPct: detail.discountPct ?? null,
      inStock: Boolean(detail.inStock),
      crawledAt: detail.crawledAt ?? new Date().toISOString(),
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