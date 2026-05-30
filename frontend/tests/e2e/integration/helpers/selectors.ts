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
    emailInput: 'input[name="email"]',
    passwordInput: 'input[name="password"]',
    nameInput: 'input[name="name"]',
    phoneInput: 'input[name="phone"]',

    submitButton: 'button[type="submit"]',
    googleButton: 'button:has-text("Tiếp tục với Google")',

    registerLink: 'button:has-text("Đăng ký ngay")',
    loginLink: 'button:has-text("Đăng nhập ngay")',
    forgotPasswordButton: 'button:has-text("Quên mật khẩu?")',
    backToLogin: 'button:has-text("Quay lại Đăng nhập")',

    brandLogo: 'a:has-text("PriceHawk"), [class*="logo"]',

    loginHeading: 'h1:has-text("Đăng nhập")',
    registerHeading: 'h1:has-text("Đăng ký")',
    forgotPasswordHeading: 'h1:has-text("Quên mật khẩu")',
    confirmHeading: 'h2:has-text("Kích hoạt tài khoản")',

    errorMessage: '[class*="error"], [class*="red"], [role="alert"], p:has-text("lỗi"), p:has-text("không đúng"), p:has-text("không hợp lệ")',
    successMessage: '[class*="success"], [class*="green"], p:has-text("thành công"), p:has-text("đã được gửi")',

    loadingButton: 'button:has-text("Đang xử lý"), button:has-text("Đang gửi")',

    dividerText: 'text=hoặc',
  },

  // ==========================================================================
  // HEADER - AppHeader.tsx
  // ==========================================================================
  header: {
    logo: 'header a >> text=PriceHawk',
    homeLink: 'header a[href="/"]',
    searchLink: 'header a[href="/search"]',
    dealsLink: 'header a[href="/deals"]',
    wishlistLink: 'header a[href="/wishlist"]',
    alertsLink: 'header a[href="/alerts"]',

    loginButton: 'button:has-text("Đăng nhập")',

    // User dropdown (khi đã login)
    userAvatar: 'header >> button >> nth=0',
    userDropdown: 'text=Hồ sơ cá nhân',
    profileMenuItem: 'button:has-text("Hồ sơ cá nhân")',
    logoutButton: 'button:has-text("Đăng xuất")',

    notificationBell: 'header >> button >> nth=1',
    notificationDropdown: 'text=Thông báo',
    unreadBadge: 'header span:has-text("9+"), header span:has-text("1")',
  },

  // ==========================================================================
  // HOME PAGE
  // ==========================================================================
  home: {
    searchInput: 'input[placeholder*="Tìm"], input[placeholder*="tìm"]',
    searchButton: 'button:has-text("Tìm và so sánh")',
    trendingSection: 'text=Trending deals',
    trendingCards: 'section >> li >> a[href^="/product/"]',
    homeProductLink: 'a[href^="/product/"]',
  },

  // ==========================================================================
  // SEARCH PAGE
  // ==========================================================================
  search: {
    searchInput: 'input[placeholder*="Tìm"], input[placeholder*="tìm"]',
    searchButton: 'button:has-text("Tìm"), button:has-text("Tìm và so sánh")',
    clearButton: 'button:has-text("Xóa")',
    sortSelect: 'select',
    sortBestPrice: 'option[value="best-price"]',

    resultsContainer: 'section',
    productCard: 'article',
    productName: 'h2, h3',
    priceText: '[class*="price"]',

    productDetailLink: 'a[href^="/product/"]',

    emptyState: 'text=Không có kết quả, text=Chưa có lựa chọn, text=Không có kết quả phù hợp',
    loadingState: 'text=Đang tải',
    noResultsState: 'text=Không tìm thấy',
  },

  // ==========================================================================
  // DEALS PAGE - DealsPage.tsx
  // ==========================================================================
  deals: {
    heading: 'h1:has-text("Những lựa chọn đáng cân nhắc")',

    // Tab buttons
    tabAll: 'button:has-text("Tất cả")',
    tabToday: 'button:has-text("Hôm nay")',
    tabWorthy: 'button:has-text("Đáng mua")',
    tabWatch: 'button:has-text("Theo dõi thêm")',

    // Section headings
    sectionTrending: 'h2:has-text("Những món đang được quan tâm nhiều")',
    sectionGoodPrice: 'h2:has-text("Đang ở vùng giá đẹp")',
    sectionObserve: 'h2:has-text("Cần quan sát kỹ hơn")',

    // Deal cards
    dealCard: 'article',
    productCompareCard: 'article',
    productDetailLink: 'a[href^="/product/"]',

    // Trending deals section (top of page)
    trendingDealsSection: 'section:has(li >> a[href^="/product/"])',
    trendingDealRow: 'li >> a[href^="/product/"]',
  },

  // ==========================================================================
  // PRODUCT DETAIL PAGE - ProductDetailPage.tsx
  // ==========================================================================
  productDetail: {
    backButton: 'a:has-text("Quay lại")',
    productTitle: 'h1',

    // QuickCompareStrip
    compareStripSection: 'section:has(h2:has-text("Nơi mua phù hợp"))',
    compareCard: 'section >> article',
    bestPriceBadge: 'text=Tốt nhất',
    platformPill: '[class*="platform"], [class*="pill"]',
    affiliateLink: 'a:has-text("Xem nơi bán"), a:has-text("Mua tại")',

    // PriceChart
    priceChartSection: 'section:has(h3:has-text("Biến động giá"))',
    svgChart: 'section svg polyline, section svg polygon',
    chartLegend: 'section >> [class*="legend"]',
    priceInfoCards: 'section >> [class*="grid"] >> div',
    lowestPrice: 'text=Thấp nhất',
    highestPrice: 'text=Cao nhất',
    fakePriceWarning: 'text=Cảnh báo tăng giá ảo',

    // Product summary
    bestPriceDisplay: '[class*="text-[2.8rem]"]',
    buyNowButton: 'a:has-text("Mua tại")',
    alertButton: 'button:has-text("Đặt alert")',
    wishlistButton: 'button:has-text("Lưu wishlist"), button:has-text("Đã lưu wishlist")',
    wishlistSavedButton: 'button:has-text("Đã lưu wishlist")',

    // Similar products
    similarSection: 'section:has(h3:has-text("Tương tự"))',
  },

  // ==========================================================================
  // WISHLIST PAGE - WishlistPage.tsx
  // ==========================================================================
  wishlist: {
    heading: 'h1:has-text("Yêu thích"), h1:has-text("Những món bạn")',
    emptyState: 'text=Danh sách wishlist của bạn đang trống',
    productCard: 'article',
    productName: 'h2, h3',
    removeButton: 'button:has-text("Xóa")',
    viewDetailButton: 'a:has-text("Xem chi tiết")',
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
  // COMMON
  // ==========================================================================
  common: {
    header: 'header',
    footer: 'footer',
    main: 'main',
    h1: 'h1',
    h2: 'h2',
    link: 'a',
    button: 'button',
    form: 'form',
    errorText: '[class*="error"], [class*="red"]',
    successText: '[class*="success"], [class*="green"]',
  },
} as const;

export type SelectorKey = keyof typeof SELECTORS;
