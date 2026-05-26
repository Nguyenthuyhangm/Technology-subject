import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_SELECTORS, MOCK_PRODUCTS } from '../helpers/api-mocks';

// ============================================================================
// SEARCH PAGE - Page Object Model
// ============================================================================

export class SearchPage extends BasePage {
  // --------------------------------------------------------------------------
  // LOCATORS - Search Form
  // --------------------------------------------------------------------------

  private get searchForm(): Locator {
    return this.page.locator('form').first();
  }

  private get searchInput(): Locator {
    return this.page.locator('input[placeholder*="Tìm"], input[placeholder*="tìm"], input[placeholder*="Tìm theo"]').first();
  }

  private get searchButton(): Locator {
    return this.page.locator('button:has-text("Tìm")').first();
  }

  private get clearButton(): Locator {
    return this.page.locator('button:has-text("Xóa"), button[aria-label*="clear"]').first();
  }

  // --------------------------------------------------------------------------
  // LOCATORS - Filters
  // --------------------------------------------------------------------------

  private get sortSelect(): Locator {
    return this.page.locator('select').first();
  }

  private get officialOnlyToggle(): Locator {
    return this.page.locator('input[type="checkbox"]').first();
  }

  private get sortByBestPrice(): Locator {
    return this.page.locator('option[value="best-price"]').first();
  }

  private get sortByRating(): Locator {
    return this.page.locator('option[value="rating"]').first();
  }

  private get sortByReviews(): Locator {
    return this.page.locator('option[value="reviews"]').first();
  }

  // --------------------------------------------------------------------------
  // LOCATORS - Results
  // --------------------------------------------------------------------------

  private get resultsContainer(): Locator {
    return this.page.locator('section:has-text("kết quả")').first();
  }

  private get productCards(): Locator {
    return this.page.locator('[class*="card"], [class*="product"]').filter({ has: this.page.locator('[class*="price"]') });
  }

  private get productNames(): Locator {
    return this.page.locator('[class*="product"] h2, [class*="product"] h3, [class*="card"] h2, [class*="card"] h3').first();
  }

  private get priceElements(): Locator {
    return this.page.locator('[class*="price"]').first();
  }

  private get emptyState(): Locator {
    return this.page.locator('text=Không có kết quả, text=Chưa có lựa chọn').first();
  }

  private get loadingState(): Locator {
    return this.page.locator('text=Đang tải, [aria-busy="true"]').first();
  }

  // --------------------------------------------------------------------------
  // LOCATORS - Quick Keywords
  // --------------------------------------------------------------------------

  private get quickKeywordButtons(): Locator {
    return this.page.locator('button:has-text("Anessa"), button:has-text("Laneige"), button:has-text("Kem chống nắng"), button:has-text("Serum")').first();
  }

  // --------------------------------------------------------------------------
  // LOCATORS - Summary
  // --------------------------------------------------------------------------

  private get resultSummary(): Locator {
    return this.page.locator('p:text-matches("kết quả")').first();
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
      waitUntil: 'networkidle',
      timeout: 30000,
    });
  }

  /**
   * Navigate to search page with specific query
   */
  async gotoWithQuery(query: string): Promise<void> {
    await this.goto(query);
  }

  // --------------------------------------------------------------------------
  // PAGE ELEMENTS
  // --------------------------------------------------------------------------

  /**
   * Check if search input is visible
   */
  async isSearchInputVisible(): Promise<boolean> {
    try {
      await this.searchInput.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if search form is visible
   */
  async isSearchFormVisible(): Promise<boolean> {
    try {
      await this.searchForm.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if results are visible
   */
  async areResultsVisible(): Promise<boolean> {
    try {
      await this.resultsContainer.waitFor({ state: 'visible', timeout: 5000 });
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

  /**
   * Check if loading state is visible
   */
  async isLoading(): Promise<boolean> {
    try {
      await this.loadingState.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // SEARCH ACTIONS
  // --------------------------------------------------------------------------

  /**
   * Fill search query
   */
  async fillSearchQuery(query: string): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.searchInput.clear();
    await this.searchInput.fill(query);
  }

  /**
   * Type search query character by character
   */
  async typeSearchQuery(query: string, delay = 100): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.searchInput.clear();
    await this.searchInput.pressSequentially(query, { delay });
  }

  /**
   * Submit search
   */
  async submitSearch(): Promise<void> {
    await this.searchButton.click();
    // Wait for results to load
    await this.page.waitForTimeout(500);
  }

  /**
   * Search with query
   */
  async search(query: string): Promise<void> {
    await this.fillSearchQuery(query);
    await this.submitSearch();
    // Wait for network to settle
    await this.waitForNetworkIdle();
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    try {
      await this.clearButton.click();
    } catch {
      // Clear button might not exist, clear input manually
      await this.searchInput.clear();
    }
  }

  /**
   * Press Enter to submit search
   */
  async submitOnEnter(): Promise<void> {
    await this.searchInput.press('Enter');
    await this.waitForNetworkIdle();
  }

  // --------------------------------------------------------------------------
  // FILTER ACTIONS
  // --------------------------------------------------------------------------

  /**
   * Select sort option
   */
  async selectSortOption(option: 'best-price' | 'rating' | 'reviews'): Promise<void> {
    await this.sortSelect.selectOption(option);
    await this.waitForTimeout(500);
  }

  /**
   * Toggle official only filter
   */
  async toggleOfficialOnly(): Promise<void> {
    await this.officialOnlyToggle.check({ force: true });
    await this.waitForTimeout(500);
  }

  // --------------------------------------------------------------------------
  // QUICK SEARCH
  // --------------------------------------------------------------------------

  /**
   * Click on quick keyword button
   */
  async clickQuickKeyword(keyword: string): Promise<void> {
    const button = this.page.locator(`button:has-text("${keyword}")`).first();
    await button.click();
    await this.waitForNetworkIdle();
  }

  /**
   * Get available quick keywords
   */
  async getQuickKeywords(): Promise<string[]> {
    const buttons = this.page.locator('button[class*="rounded-full"]');
    const count = await buttons.count();
    const keywords: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent();
      if (text && text.trim()) {
        keywords.push(text.trim());
      }
    }
    return keywords;
  }

  // --------------------------------------------------------------------------
  // RESULTS
  // --------------------------------------------------------------------------

  /**
   * Get product count in results
   */
  async getProductCount(): Promise<number> {
    const count = await this.productCards.count();
    return count;
  }

  /**
   * Get result summary text
   */
  async getResultSummary(): Promise<string> {
    try {
      const summary = await this.resultSummary.textContent();
      return summary ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Get all product names from results
   */
  async getProductNames(): Promise<string[]> {
    const cards = this.productCards;
    const count = await cards.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const nameElement = card.locator('h2, h3').first();
      try {
        const name = await nameElement.textContent();
        if (name) {
          names.push(name.trim());
        }
      } catch {
        // Skip cards without names
      }
    }

    return names;
  }

  /**
   * Get lowest price from results
   */
  async getLowestPrice(): Promise<number | null> {
    const prices = await this.page.locator('[class*="price"]').allTextContents();
    if (prices.length === 0) return null;

    const priceValues = prices
      .map((p) => {
        // Extract number from price string like "299.000đ" or "299,000"
        const match = p.replace(/[^\d]/g, '');
        return parseInt(match, 10);
      })
      .filter((p) => !isNaN(p));

    return priceValues.length > 0 ? Math.min(...priceValues) : null;
  }

  /**
   * Click on first product in results
   */
  async clickFirstProduct(): Promise<void> {
    const firstCard = this.productCards.first();
    await firstCard.click();
    await this.waitForLoad();
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
  // ASSERTIONS
  // --------------------------------------------------------------------------

  /**
   * Assert search page is loaded
   */
  async assertPageLoaded(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    await expect(this.searchButton).toBeVisible();
  }

  /**
   * Assert results contain expected product
   */
  async assertProductInResults(productName: string): Promise<void> {
    const pageContent = await this.page.content();
    expect(pageContent).toContain(productName);
  }

  /**
   * Assert results are empty
   */
  async assertNoResults(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Assert loading is complete
   */
  async assertLoadingComplete(): Promise<void> {
    // Wait for loading to disappear
    await this.page.waitForFunction(
      () => {
        const loadingElements = document.querySelectorAll('[aria-busy="true"]');
        const loadingText = document.body.innerText;
        return loadingElements.length === 0 && !loadingText.includes('Đang tải');
      },
      { timeout: 10000 }
    );
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Wait for search results to load
   */
  async waitForResults(): Promise<void> {
    // Wait for either results or empty state
    await Promise.race([
      this.resultsContainer.waitFor({ state: 'visible', timeout: 10000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  }

  /**
   * Scroll to load more results
   */
  async scrollForMoreResults(): Promise<void> {
    await this.scrollToBottom();
    await this.waitForTimeout(500);
  }

  /**
   * Take screenshot of search results
   */
  async screenshotResults(name: string): Promise<void> {
    await this.resultsContainer.screenshot({
      path: `./test-results/screenshots/search-${name}-${Date.now()}.png`,
    });
  }
}

// ============================================================================
// SEARCH PAGE WITH MOCKED RESULTS
// ============================================================================

export class MockedSearchPage extends SearchPage {
  private mockProducts = MOCK_PRODUCTS;

  /**
   * Override search to return mock results
   */
  async search(query: string): Promise<void> {
    await this.fillSearchQuery(query);
    await this.submitSearch();

    // The mock should already be set up via api-mocks
    // Just wait for UI to update
    await this.waitForResults();
  }

  /**
   * Get mock product data
   */
  getMockProducts() {
    return this.mockProducts;
  }
}
