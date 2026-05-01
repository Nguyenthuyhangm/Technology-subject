import path from 'node:path';
import { env } from '../config/env';
import {
  LISTING_STATE_FILE,
  OUTPUT_CATEGORIES_FILE,
  OUTPUT_LISTINGS_FILE,
  RAW_DEBUG_HTML_DIR,
  RAW_LISTINGS_DIR,
  SEEN_URLS_FILE,
} from '../config/constants';
import { closeBrowserSession, createBrowserSession } from '../core/browser';
import { logger } from '../core/logger';
import { readJson, writeHtml, writeJson } from '../core/file-store';
import { extractListingPage } from '../extractors/listing.extractor';
import { RawCategory } from '../types/category.types';
import { RawListingPage } from '../types/listing.types';
import { fileSafeName } from '../utils/url';
import { SELECTORS } from '../config/selectors';

function makePageKey(categoryPath: string, pageNumber: number): string {
  return `${categoryPath}::${pageNumber}`;
}

function sortListingPages(pages: RawListingPage[]): RawListingPage[] {
  return [...pages].sort((a, b) => {
    const byCategory = a.categoryName.localeCompare(b.categoryName, 'vi');
    if (byCategory !== 0) return byCategory;
    return a.page - b.page;
  });
}

export async function runCrawlListings(): Promise<RawListingPage[]> {
  const categories = await readJson<RawCategory[]>(OUTPUT_CATEGORIES_FILE, []);
  if (categories.length === 0) {
    throw new Error(`No categories found. Run discover-categories first.`);
  }

  // 1. Đọc dữ liệu cũ để resume thật sự
  const existingPages = await readJson<RawListingPage[]>(OUTPUT_LISTINGS_FILE, []);
  const existingSeenUrls = await readJson<Record<string, boolean>>(SEEN_URLS_FILE, {});

  // Map giữ trạng thái page theo category + page
  const pageMap = new Map<string, RawListingPage>();
  for (const page of existingPages) {
    pageMap.set(makePageKey(page.categoryPath, page.page), page);
  }

  // seenUrls giữ lại dữ liệu cũ
  const seenUrls: Record<string, boolean> = { ...existingSeenUrls };

  const session = await createBrowserSession({ blockAssets: true });

  let crawledPageCount = 0;
  let updatedPageCount = 0;
  let failedPageCount = 0;

  try {
    for (const category of categories) {
      let emptyPageStreak = 0;

      for (let pageNumber = 1; pageNumber <= env.listingMaxPages; pageNumber += 1) {
        const url = `${env.baseUrl}${category.path}?page=${pageNumber}`;
        const pageKey = makePageKey(category.path, pageNumber);

        logger.info({ url, page: pageNumber, category: category.name }, 'Crawling Cocolux listing');

        const page = await session.context.newPage();

        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

          await page.waitForSelector(`${SELECTORS.listing.card} h3`, {
            state: 'attached',
            timeout: 10000,
          }).catch(() => logger.warn({ url }, 'Listing data loaded slowly or page may be empty'));

          await page.evaluate(() => window.scrollBy(0, 600)).catch(() => undefined);
          await page.waitForTimeout(1000);

          const listingPage = await extractListingPage(page, {
            baseUrl: env.baseUrl,
            categoryPath: category.path,
            categoryName: category.name,
            pageNumber,
            currentUrl: url,
          });

          crawledPageCount += 1;

          if (listingPage.items.length > 0) {
            emptyPageStreak = 0;

            // 2. Ghi đè đúng page hiện tại thay vì reset toàn bộ
            pageMap.set(pageKey, listingPage);
            updatedPageCount += 1;

            for (const item of listingPage.items) {
              if (item.productUrl) {
                seenUrls[item.productUrl] = true;
              }
            }

            const filename = `${fileSafeName(category.name)}-page-${pageNumber}.json`;
            await writeJson(path.join(RAW_LISTINGS_DIR, filename), listingPage);

            // 3. Snapshot output sau mỗi page thành công
            const snapshot = sortListingPages(Array.from(pageMap.values()));
            await writeJson(OUTPUT_LISTINGS_FILE, snapshot);
            await writeJson(SEEN_URLS_FILE, seenUrls);
            await writeJson(LISTING_STATE_FILE, {
              lastRunAt: new Date().toISOString(),
              success: true,
              crawledPageCount,
              updatedPageCount,
              failedPageCount,
              totalStoredPages: snapshot.length,
              totalSeenUrls: Object.keys(seenUrls).length,
              lastCategory: category.name,
              lastPage: pageNumber,
            });
          } else {
            logger.warn({ url, category: category.name, page: pageNumber }, 'Empty listing page detected');

            // Nếu page 1 đã trống thì category này không có dữ liệu
            // Nếu page > 1 trống thì thường là đã hết phân trang
            emptyPageStreak += 1;

            if (pageNumber === 1 || emptyPageStreak >= 1) {
              break;
            }
          }
        } catch (error) {
          failedPageCount += 1;
          logger.error({ err: error, url, category: category.name, page: pageNumber }, 'Lỗi khi cào trang listing');

          if (env.saveDebugHtmlOnError) {
            const html = await page.content().catch(() => '');
            const filename = `${fileSafeName(category.name)}-page-${pageNumber}.html`;
            await writeHtml(path.join(RAW_DEBUG_HTML_DIR, filename), html);
          }

          // Không break toàn category ngay; cho phép chạy tiếp page sau
        } finally {
          await page.close();
        }
      }
    }

    const finalResults = sortListingPages(Array.from(pageMap.values()));

    await writeJson(OUTPUT_LISTINGS_FILE, finalResults);
    await writeJson(SEEN_URLS_FILE, seenUrls);
    await writeJson(LISTING_STATE_FILE, {
      lastRunAt: new Date().toISOString(),
      success: true,
      crawledPageCount,
      updatedPageCount,
      failedPageCount,
      totalStoredPages: finalResults.length,
      totalSeenUrls: Object.keys(seenUrls).length,
    });

    return finalResults;
  } catch (error) {
    await writeJson(LISTING_STATE_FILE, {
      lastRunAt: new Date().toISOString(),
      success: false,
      crawledPageCount,
      updatedPageCount,
      failedPageCount,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await closeBrowserSession(session);
  }
}