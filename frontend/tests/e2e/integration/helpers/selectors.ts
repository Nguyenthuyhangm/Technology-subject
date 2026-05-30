/**
 * Real Selectors - Dựa trên UI thật của PriceHawk
 *
 * NGUYÊN TẮC:
 * - Không hard-code text không chắc chắn
 * - Ưu tiên selectors ổn định (id, name, type, placeholder)
 * - Sử dụng text content chỉ khi chắc chắn
 */

export const SELECTORS = {
  // ==========================================================================
  // AUTH PAGE - AuthPage.tsx
  // ==========================================================================
  auth: {
    // Form inputs (dựa trên name attribute)
    emailInput: 'input[name="email"]',
    passwordInput: 'input[name="password"]',
    nameInput: 'input[name="name"]',
    phoneInput: 'input[name="phone"]',

    // Buttons
    submitButton: 'button[type="submit"]',
    googleButton: 'button:has-text("Tiếp tục với Google")',

    // Mode switching buttons
    registerLink: 'button:has-text("Đăng ký ngay")',
    loginLink: 'button:has-text("Đăng nhập ngay")',
    forgotPasswordButton: 'button:has-text("Quên mật khẩu?")',
    backToLogin: 'button:has-text("Quay lại Đăng nhập")',

    // Brand logo
    brandLogo: 'a:has-text("PriceHawk"), [class*="logo"]',

    // Headings
    loginHeading: 'h1:has-text("Đăng nhập")',
    registerHeading: 'h1:has-text("Đăng ký")',
    forgotPasswordHeading: 'h1:has-text("Quên mật khẩu")',
    confirmHeading: 'h2:has-text("Kích hoạt tài khoản")',

    // Messages - Use more flexible selectors
    errorMessage: '[class*="error"], [class*="red"], [role="alert"], p:has-text("lỗi"), p:has-text("không đúng"), p:has-text("không hợp lệ")',
    successMessage: '[class*="success"], [class*="green"], p:has-text("thành công"), p:has-text("đã được gửi")',

    // Loading states
    loadingButton: 'button:has-text("Đang xử lý"), button:has-text("Đang gửi")',

    // Divider
    dividerText: 'text=hoặc',
  },

  // ==========================================================================
  // HEADER - AppHeader.tsx
  // ==========================================================================
  header: {
    // Brand/Logo
    logo: 'header a:has-text("PriceHawk"), header a:has-text("Price"), header a:has-text("Hawk"), header [class*="logo"]',

    // Navigation links (dựa trên href)
    navLinks: 'header nav a',
    homeLink: 'header a[href="/"]',
    searchLink: 'header a[href="/search"]',
    dealsLink: 'header a[href="/deals"]',
    wishlistLink: 'header a[href="/wishlist"]',
    alertsLink: 'header a[href="/alerts"]',

    // Auth buttons
    loginButton: 'button:has-text("Đăng nhập")',

    // User dropdown (khi đã login)
    userAvatar: 'header button >> nth=0', // First button in right section
    userDropdown: 'header >> text=Hồ sơ cá nhân',

    // User info in dropdown
    profileMenuItem: 'button:has-text("Hồ sơ cá nhân")',
    logoutButton: 'button:has-text("Đăng xuất")',

    // Notification bell
    notificationBell: 'header button >> nth=1', // Second button in right section
    notificationDropdown: 'text=Thông báo',

    // Unread badge
    unreadBadge: 'header span:has-text("9+"), header span:has-text("1")',
  },

  // ==========================================================================
  // SEARCH PAGE - SearchResultsPage.tsx
  // ==========================================================================
  search: {
    // Search form
    searchForm: 'form',
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
    productCard: 'article',
    productName: 'h2, h3',
    priceText: '[class*="price"]',

    // Product links
    productDetailLink: 'a[href^="/product/"]',
    viewDetailButton: 'a:has-text("Xem chi tiết")',

    // States
    emptyState: 'text=Không có kết quả, text=Chưa có lựa chọn, text=Không có kết quả phù hợp',
    loadingState: 'text=Đang tải',
    noResultsState: 'text=Không tìm thấy',

    // Quick keywords (buttons on home page)
    quickKeywordAnessa: 'button:has-text("Anessa")',
    quickKeywordLaneige: 'button:has-text("Laneige")',
    quickKeywordSunscreen: 'button:has-text("Kem chống nắng")',
    quickKeywordSerum: 'button:has-text("Serum")',
  },

  // ==========================================================================
  // HOME PAGE - HomePage.tsx
  // ==========================================================================
  home: {
    // Search bar on home
    homeSearchInput: 'input[placeholder*="Tìm"], input[placeholder*="tìm"]',
    homeSearchButton: 'button:has-text("Tìm và so sánh")',

    // Categories
    categorySection: 'text=Danh mục',
    categoryLinks: 'a[href*="/search?q="]',

    // Featured deals/trending
    trendingSection: 'text=Chọn lọc hôm nay, text=Những món đang ở vùng giá đẹp',
    dealCards: 'article',
    productCard: 'article',

    // Deal section on homepage (Những món đang ở vùng giá đẹp)
    dealSection: 'h2:has-text("Những món đang ở vùng giá đẹp")',
    dealSectionLink: 'article >> a[href^="/product/"]',

    // Product links on home page
    featuredProductLink: 'a:has-text("Xem chi tiết")',
    productDetailLink: 'a[href^="/product/"]',

    // CTA
    ctaSection: 'text=Mua sắm',
    wishlistCtaButton: 'a:has-text("Mở Wishlist")',
  },

  // ==========================================================================
  // COMMON
  // ==========================================================================
  common: {
    // Page structure
    header: 'header',
    footer: 'footer',
    main: 'main',

    // Page heading
    h1: 'h1',
    h2: 'h2',

    // Links
    link: 'a',

    // Buttons
    button: 'button',

    // Forms
    form: 'form',

    // Error states
    errorText: '[class*="error"], [class*="red"]',

    // Success states
    successText: '[class*="success"], [class*="green"]',
  },

  // ==========================================================================
  // PROTECTED PAGES
  // ==========================================================================
  protected: {
    // Wishlist page
    wishlistHeading: 'text=Yêu thích',
    addToWishlistButton: 'button:has-text("Yêu thích")',
    removeFromWishlistButton: 'button:has-text("Xóa yêu thích")',

    // Alerts page
    alertsHeading: 'text=Theo dõi giá',
    createAlertButton: 'button:has-text("Tạo alert"), button:has-text("Thêm alert")',

    // Profile page
    profileHeading: 'text=Hồ sơ',
  },

  // ==========================================================================
  // DEALS PAGE - DealsPage.tsx
  // ==========================================================================
  deals: {
    heading: 'text=Những lựa chọn đáng cân nhắc',
    dealCard: 'article',
    flashSaleBadge: 'text=Flash Sale',
    topDealBadge: 'text=Top Deal',
    productDetailLink: 'a:has-text("Xem chi tiết")',
  },

  // ==========================================================================
  // PRODUCT DETAIL PAGE - ProductDetailPage.tsx
  // ==========================================================================
  productDetail: {
    backButton: 'a:has-text("Quay lại")',
    productTitle: 'h1',
    wishlistButton: 'button:has-text("wishlist"), button:has-text("Wishlist"), button:has-text("Lưu wishlist")',
    wishlistSavedButton: 'button:has-text("Đã lưu wishlist")',
    alertButton: 'button:has-text("Đặt alert")',
    buyButton: 'a:has-text("Mua tại")',
    priceText: '[class*="text-[2.8rem]"]',
  },

  // ==========================================================================
  // ALERTS PAGE - AlertsPage.tsx
  // ==========================================================================
  alerts: {
    heading: 'h1:has-text("Những mức giá")',
    emptyState: 'text=Chưa có alert nào',
    productCard: 'article',
    productName: 'h2',
    deleteButton: 'button:has-text("Xóa")',
    confirmDeleteButton: 'button:has-text("Xóa alert")',
    cancelDeleteButton: 'button:has-text("Hủy")',
    targetPrice: 'p[class*="text-[2rem]"]',
  },

  // ==========================================================================
  // ALERT MODAL - AlertModal.tsx
  // ==========================================================================
  alertModal: {
    modalTitle: 'h2:has-text("Đặt cảnh báo giá")',
    targetPriceInput: 'input[placeholder="0"]',
    createAlertButton: 'button:has-text("Tạo alert")',
    cancelButton: 'button:has-text("Hủy")',
    closeButton: 'button >> .lucide-x',
    successMessage: 'h3:has-text("Alert đã được tạo")',
    doneButton: 'button:has-text("Xong")',
    priceFormatted: 'p >> text=VNĐ',
  },

  // ==========================================================================
  // WISHLIST PAGE - WishlistPage.tsx
  // ==========================================================================
  wishlist: {
    heading: 'h1:has-text("Yêu thích"), h1:has-text("Những món bạn")',
    emptyState: 'text=Danh sách wishlist của bạn đang trống',
    productCard: 'article',
    productName: 'h2',
    removeButton: 'button:has-text("Xóa")',
    viewDetailButton: 'a:has-text("Xem chi tiết")',
  },
} as const;

// Helper types
export type SelectorKey = keyof typeof SELECTORS;
export type AuthSelector = typeof SELECTORS.auth;
export type HeaderSelector = typeof SELECTORS.header;
export type SearchSelector = typeof SELECTORS.search;
