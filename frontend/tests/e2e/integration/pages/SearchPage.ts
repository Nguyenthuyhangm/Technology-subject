/**
 * Search Page - Phase 2 Integration Tests
 *
 * Page Object cho SearchResultsPage.tsx
 * Sử dụng SELECTORS từ helpers/selectors.ts.
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

// ============================================================================
// SELECTORS - Dựa trên UI thật của SearchResultsPage.tsx
// ============================================================================

const SEARCH_SELECTORS = {
  // Search form
  searchInput: 'input[placeholder*="Tìm"], input[placeholder*="tìm"]',
  searchButton: 'button:has-text("Tìm"), button:has-text("Tìm và so sánh")',
  clearButton: 'button:has-text("Xóa")',

  // Filters
  sortSelect: 'select',
  sortBestPrice: 'option[value="best-price"]',
  sortRating: 'option[value="rating"]',
  sortReviews: 'option[value="reviews"]',

  // Results
  resultsContainer: 'section',
  productCard: '[class*="card"], [class*="product"]',
  productName: 'h2, h3',
  priceText: '[class*="price"]',

  // States
  emptyState: 'text=Không có kết quả, text=Chưa có lựa chọn',
  loadingState: 'text=Đang tải',
  noResultsState: 'text=Không tìm thấy',

  // Quick keywords
  quickKeywordAnessa: 'button:has-text("Anessa")',
  quickKeywordLaneige: 'button:has-text("Laneige")',
  quickKeywordSunscreen: 'button:has-text("Kem chống nắng")',
  quickKeywordSerum: 'button:has-text("Serum")',
} as const;

// ============================================================================
// SEARCH PAGE
// ============================================================================

export class SearchPage extends BasePage {
  // --------------------------------------------------------------------------
  // LOCATORS
  // --------------------------------------------------------------------------

  private get searchInput(): Locator {
    return this.page.locator(SEARCH_SELECTORS.searchInput);
  }

  private get searchButton(): Locator {
    return this.page.locator(SEARCH_SELECTORS.searchButton);
  }

  private get sortSelect(): Locator {
    return this.page.locator(SEARCH_SELECTORS.sortSelect);
  }

  private get productCards(): Locator {
    return this.page.locator(SEARCH_SELECTORS.productCard);
  }

  private get emptyState(): Locator {
    return this.page.locator(SEARCH_SELECTORS.emptyState);
  }

  // --------------------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------------------

  constructor(page: Page) {
    super(page);
  }

  // --------------------------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------------------------

  /**
   * Navigate to search page.
   * Uses relative path - Playwright prepends baseURL from config automatically.
   */
  async goto(query?: string): Promise<void> {
    const path = query ? `/search?q=${encodeURIComponent(query)}` : '/search';
    await this.page.goto(path, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await this.waitForTimeout(500);
  }

  // --------------------------------------------------------------------------
  // SEARCH ACTIONS
  // --------------------------------------------------------------------------

  /**
   * Fill search query
   */
  async fillSearchQuery(query: string): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.searchInput.clear();
    await this.searchInput.fill(query);
  }

  /**
   * Submit search (click button)
   */
  async submitSearch(): Promise<void> {
    await this.searchButton.click();
    await this.waitForTimeout(1000);
  }

  /**
   * Search with query
   */
  async search(query: string): Promise<void> {
    await this.fillSearchQuery(query);
    await this.submitSearch();
  }

  /**
   * Submit on Enter key
   */
  async submitOnEnter(): Promise<void> {
    await this.searchInput.press('Enter');
    await this.waitForTimeout(1000);
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    const clearButton = this.page.locator(SEARCH_SELECTORS.clearButton);
    const clearVisible = await clearButton.isVisible().catch(() => false);

    if (clearVisible) {
      await clearButton.click();
    } else {
      await this.searchInput.clear();
    }
  }

  // --------------------------------------------------------------------------
  // FILTER ACTIONS
  // --------------------------------------------------------------------------

  /**
   * Select sort option
   */
  async selectSortOption(option: 'best-price' | 'rating' | 'reviews'): Promise<void> {
    await this.sortSelect.waitFor({ state: 'visible', timeout: 5000 });
    await this.sortSelect.selectOption(option);
    await this.waitForTimeout(500);
  }

  // --------------------------------------------------------------------------
  // RESULTS
  // --------------------------------------------------------------------------

  /**
   * Get product count in results
   */
  async getProductCount(): Promise<number> {
    return await this.productCards.count();
  }

  /**
   * Check if search results are visible
   */
  async areResultsVisible(): Promise<boolean> {
    try {
      await this.productCards.first().waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    try {
      await this.emptyState.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // ASSERTIONS
  // --------------------------------------------------------------------------

  /**
   * Assert search page is loaded
   */
  async assertPageLoaded(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
  }

  /**
   * Assert results are empty
   */
  async assertNoResults(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  // --------------------------------------------------------------------------
  // URL & STATE
  // --------------------------------------------------------------------------

  /**
   * Check if URL has search query parameter
   */
  async hasQueryInURL(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('q=');
  }

  /**
   * Get current search query from URL
   */
  async getCurrentQuery(): Promise<string | null> {
    const url = this.page.url();
    const match = url.match(/[?&]q=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // QUICK SEARCH
  // --------------------------------------------------------------------------

  /**
   * Click on quick keyword button
   */
  async clickQuickKeyword(keyword: 'Anessa' | 'Laneige' | 'Serum' | 'Kem chống nắng'): Promise<void> {
    const selectorKey = `quickKeyword${keyword.replace(/\s+/g, '')}` as keyof typeof SEARCH_SELECTORS;
    const button = this.page.locator(SEARCH_SELECTORS[selectorKey] as string);
    await button.click();
    await this.waitForTimeout(1000);
  }
}

// Export selectors for external use
export { SEARCH_SELECTORS };
