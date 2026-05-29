package com.pricehawl.controller;

import com.pricehawl.entity.AffiliateClick;
import com.pricehawl.entity.CrawlError;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.entity.User;
import com.pricehawl.repository.*;
import com.pricehawl.service.AccessTradeService;
import com.pricehawl.service.MultiPlatformPriceRefreshService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductListingRepository productListingRepository;
    private final PriceAlertRepository priceAlertRepository;
    private final WishlistRepository wishlistRepository;
    private final AffiliateClickRepository affiliateClickRepository;
    private final NotificationRepository notificationRepository;
    private final CrawlErrorRepository crawlErrorRepository;
    private final AccessTradeService accessTradeService;
    private final MultiPlatformPriceRefreshService refreshService;

    private final ExecutorService adminCrawlerPool = Executors.newSingleThreadExecutor();
    private volatile Future<?> currentCrawlerTask = null;

    // ── Metrics ───────────────────────────────────────────────────────────────

    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        long totalUsers = userRepository.count();
        long totalProducts = productRepository.count();
        long totalAlerts = priceAlertRepository.count();
        long activeAlerts = priceAlertRepository.countByIsActiveTrue();
        long totalWishlists = wishlistRepository.count();
        long totalClicks = affiliateClickRepository.count();
        long clicksLast30Days = affiliateClickRepository.countByClickedAtAfter(thirtyDaysAgo);
        long totalNotifications = notificationRepository.count();

        Object transactions = null;
        try {
            String since = thirtyDaysAgo.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + "T00:00:00Z";
            String until = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + "T23:59:59Z";
            transactions = accessTradeService.getTransactions(since, until, null, null);
        } catch (Exception e) {
            transactions = Map.of("total", 0, "data", java.util.List.of());
        }

        return ResponseEntity.ok(Map.of(
            "users", Map.of("total", totalUsers),
            "products", Map.of("total", totalProducts),
            "alerts", Map.of("total", totalAlerts, "active", activeAlerts),
            "wishlists", Map.of("total", totalWishlists),
            "affiliate", Map.of("totalClicks", totalClicks, "clicksLast30Days", clicksLast30Days),
            "notifications", Map.of("total", totalNotifications),
            "transactions", transactions
        ));
    }

    // ── User Management ───────────────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getUsers(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String plan
    ) {
        List<User> users;
        if (search != null && !search.isBlank()) {
            users = userRepository.findByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(search, search);
        } else {
            users = userRepository.findAll();
        }

        if (plan != null && !plan.isBlank() && !plan.equals("all")) {
            users = users.stream()
                .filter(u -> plan.equals(u.getPlan()))
                .collect(Collectors.toList());
        }

        List<Map<String, Object>> result = users.stream().map(u -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", u.getId());
            map.put("email", u.getEmail());
            map.put("name", u.getName());
            map.put("plan", u.getPlan());
            map.put("phone", u.getPhone());
            map.put("created_at", u.getCreatedAt());
            map.put("alertCount", priceAlertRepository.countByUserIdAndIsActiveTrue(u.getId()));
            map.put("wishlistCount", wishlistRepository.countByUserId(u.getId()));
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PatchMapping("/users/{id}")
    public ResponseEntity<User> updateUser(
        @PathVariable UUID id,
        @RequestBody Map<String, String> body
    ) {
        return userRepository.findById(id).map(user -> {
            if (body.containsKey("plan")) {
                String p = body.get("plan");
                if (p.equals("free") || p.equals("premium")) user.setPlan(p);
            }
            if (body.containsKey("name")) user.setName(body.get("name"));
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── Product Management ────────────────────────────────────────────────────

    @GetMapping("/products")
    public ResponseEntity<List<Map<String, Object>>> getProducts(
        @RequestParam(required = false) String platform,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String inStock,
        @RequestParam(required = false) Integer outOfStockMonths,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        List<ProductListing> listings;

        if (platform != null && !platform.isBlank() && !platform.equals("all")) {
            listings = productListingRepository.findByPlatformNameIgnoreCase(platform);
        } else {
            listings = productListingRepository.findAll();
        }

        // Filter theo status
        if (status != null && !status.isBlank() && !status.equals("all")) {
            listings = listings.stream()
                .filter(l -> status.equals(l.getStatus()))
                .collect(Collectors.toList());
        }

        // Filter theo inStock
        if (inStock != null && !inStock.isBlank()) {
            boolean inStockBool = Boolean.parseBoolean(inStock);
            listings = listings.stream()
                .filter(l -> inStockBool == Boolean.TRUE.equals(l.getInStock()))
                .collect(Collectors.toList());
        }

        // Filter hết hàng quá X tháng
        if (outOfStockMonths != null && outOfStockMonths > 0) {
            LocalDateTime threshold = LocalDateTime.now().minusMonths(outOfStockMonths);
            listings = listings.stream()
                .filter(l -> Boolean.FALSE.equals(l.getInStock())
                    && l.getUpdatedAt() != null
                    && l.getUpdatedAt().isBefore(threshold))
                .collect(Collectors.toList());
        }

        int total = listings.size();
        int from = page * size;
        int to = Math.min(from + size, total);
        List<ProductListing> paged = from >= total ? List.of() : listings.subList(from, to);

        List<Map<String, Object>> result = paged.stream().map(l -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("listingId", l.getId());
            map.put("productId", l.getProduct().getId());
            map.put("productName", l.getProduct().getName());
            map.put("platform", l.getPlatformName());
            map.put("currentPrice", l.getCurrentPrice());
            map.put("status", l.getStatus());
            map.put("inStock", l.getInStock());
            map.put("imageUrl", l.getPlatformImageUrl());
            map.put("url", l.getUrl());
            map.put("crawlTime", l.getCrawlTime());
            map.put("updatedAt", l.getUpdatedAt());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok()
            .header("X-Total-Count", String.valueOf(total))
            .body(result);
    }

    // Thống kê số listing hết hàng theo mốc thời gian
    @GetMapping("/products/out-of-stock-stats")
    public ResponseEntity<Map<String, Object>> getOutOfStockStats() {
        return ResponseEntity.ok(Map.of(
            "over1Month",  productListingRepository.countByInStockFalseAndUpdatedAtBefore(LocalDateTime.now().minusMonths(1)),
            "over3Months", productListingRepository.countByInStockFalseAndUpdatedAtBefore(LocalDateTime.now().minusMonths(3)),
            "over6Months", productListingRepository.countByInStockFalseAndUpdatedAtBefore(LocalDateTime.now().minusMonths(6)),
            "over9Months", productListingRepository.countByInStockFalseAndUpdatedAtBefore(LocalDateTime.now().minusMonths(9))
        ));
    }

    @PatchMapping("/products/{listingId}/status")
    public ResponseEntity<Void> updateListingStatus(
        @PathVariable UUID listingId,
        @RequestBody Map<String, String> body
    ) {
        return productListingRepository.findById(listingId).map(listing -> {
            String newStatus = body.get("status");
            if (newStatus != null && !newStatus.isBlank()) {
                listing.setStatus(newStatus);
                productListingRepository.save(listing);
            }
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // Xóa 1 listing, tự check xóa product nếu không còn listing nào
    @DeleteMapping("/products/listings/{listingId}")
public ResponseEntity<Map<String, Object>> deleteListing(@PathVariable UUID listingId) {
    return productListingRepository.findById(listingId).map(listing -> {
        UUID productId = listing.getProduct().getId();
        String productName = listing.getProduct().getName();

        productListingRepository.deleteById(listingId);

        List<ProductListing> remaining = productListingRepository.findByProductId(productId);
        boolean productDeleted = false;
        if (remaining.isEmpty()) {
            productRepository.deleteById(productId);
            productDeleted = true;
            log.info("Deleted product {} because no listings remain", productName);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("listingDeleted", true);
        result.put("productDeleted", productDeleted);
        result.put("productName", productName);
        return ResponseEntity.ok(result);
    }).orElse(ResponseEntity.notFound().build());
}
    // Bulk delete listing hết hàng quá X tháng
    @DeleteMapping("/products/out-of-stock-cleanup")
    public ResponseEntity<Map<String, Object>> cleanupOutOfStock(
        @RequestParam(defaultValue = "3") int months
    ) {
        LocalDateTime threshold = LocalDateTime.now().minusMonths(months);
        List<ProductListing> toDelete = productListingRepository
            .findByInStockFalseAndUpdatedAtBefore(threshold);

        int listingsDeleted = 0;
        int productsDeleted = 0;

        for (ProductListing listing : toDelete) {
            UUID productId = listing.getProduct().getId();
            productListingRepository.deleteById(listing.getId());
            listingsDeleted++;

            List<ProductListing> remaining = productListingRepository.findByProductId(productId);
            if (remaining.isEmpty()) {
                productRepository.deleteById(productId);
                productsDeleted++;
            }
        }

        log.info("Cleanup: deleted {} listings, {} products (out of stock > {} months)",
            listingsDeleted, productsDeleted, months);

        return ResponseEntity.ok(Map.of(
            "listingsDeleted", listingsDeleted,
            "productsDeleted", productsDeleted,
            "months", months
        ));
    }

    @PostMapping("/products/hide-out-of-stock")
    public ResponseEntity<Map<String, Object>> hideOutOfStock() {
        List<ProductListing> outOfStock = productListingRepository.findByInStockFalse();
        outOfStock.forEach(l -> {
            if (!"hidden".equals(l.getStatus())) l.setStatus("hidden");
        });
        productListingRepository.saveAll(outOfStock);
        return ResponseEntity.ok(Map.of(
            "hidden", outOfStock.size(),
            "message", outOfStock.size() + " sản phẩm hết hàng đã bị ẩn"
        ));
    }

    @PostMapping("/products/show-out-of-stock")
    public ResponseEntity<Map<String, Object>> showOutOfStock() {
        List<ProductListing> outOfStock = productListingRepository.findByInStockFalse();
        outOfStock.forEach(l -> {
            if ("hidden".equals(l.getStatus())) l.setStatus("out_of_stock");
        });
        productListingRepository.saveAll(outOfStock);
        return ResponseEntity.ok(Map.of(
            "shown", outOfStock.size(),
            "message", outOfStock.size() + " sản phẩm đã được hiện lại"
        ));
    }

    /// ── Crawler Management ────────────────────────────────────────────────────

@GetMapping("/crawler/status")
public ResponseEntity<Map<String, Object>> getCrawlerStatus() {
    LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);

    long highQueue = productListingRepository.findAllHighPriorityListings().size();
    long mediumQueue = productListingRepository.findAllMediumPriorityListings().size();
    long lowQueue = productListingRepository.findAllLowPriorityListings().size();

    long errorsToday = crawlErrorRepository.countByCrawledAtAfter(oneDayAgo);
    boolean isRunning = currentCrawlerTask != null && !currentCrawlerTask.isDone();

    return ResponseEntity.ok(Map.of(
        "queue", Map.of("high", highQueue, "medium", mediumQueue, "low", lowQueue),
        "errorsToday", errorsToday,
        "isRunning", isRunning
    ));
}

// Tách riêng endpoint platformStats — chỉ gọi khi cần, không gọi liên tục
@GetMapping("/crawler/platform-stats")
public ResponseEntity<List<Map<String, Object>>> getCrawlerPlatformStats() {
    LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);

    List<String> platforms = List.of("Tiki", "Watsons", "Hasaki", "Guardian", "Cocolux");
    List<Map<String, Object>> platformStats = platforms.stream().map(p -> {
        Map<String, Object> stat = new LinkedHashMap<>();
        stat.put("platform", p);

        List<ProductListing> listings = productListingRepository.findByPlatformNameIgnoreCase(p);
        long recentlyCrawled = listings.stream()
            .filter(l -> l.getCrawlTime() != null && l.getCrawlTime().isAfter(oneDayAgo))
            .count();
        Optional<LocalDateTime> lastCrawl = listings.stream()
            .filter(l -> l.getCrawlTime() != null)
            .map(ProductListing::getCrawlTime)
            .max(LocalDateTime::compareTo);

        stat.put("totalListings", listings.size());
        stat.put("crawledLast24h", recentlyCrawled);
        stat.put("lastCrawlTime", lastCrawl.orElse(null));
        stat.put("errorCount", crawlErrorRepository.countByPlatformIgnoreCase(p));
        return stat;
    }).collect(Collectors.toList());

    return ResponseEntity.ok(platformStats);
}

@PostMapping("/crawler/trigger/{priority}")
public ResponseEntity<Map<String, Object>> triggerCrawler(@PathVariable String priority) {
    if (currentCrawlerTask != null && !currentCrawlerTask.isDone()) {
        currentCrawlerTask.cancel(true);
        log.info("Cancelled previous crawler task, starting new: {}", priority);
    }

    currentCrawlerTask = adminCrawlerPool.submit(() -> {
        switch (priority.toLowerCase()) {
            case "high"   -> refreshService.runHighPriorityForce();
            case "medium" -> refreshService.runMediumPriorityForce();
            case "low"    -> refreshService.runLowPriorityForce();
        }
    });

    return ResponseEntity.ok(Map.of(
        "triggered", priority,
        "message", "Crawler " + priority + " đang chạy nền"
    ));
}

@PostMapping("/crawler/stop")
public ResponseEntity<Map<String, Object>> stopCrawler() {
    if (currentCrawlerTask != null && !currentCrawlerTask.isDone()) {
        currentCrawlerTask.cancel(true);
        log.info("Crawler stopped by admin");
        return ResponseEntity.ok(Map.of("message", "Crawler đã dừng"));
    }
    return ResponseEntity.ok(Map.of("message", "Không có crawler nào đang chạy"));
}

// ── Crawl Errors - có phân trang ──────────────────────────────────────────

@GetMapping("/crawler/errors")
public ResponseEntity<List<CrawlError>> getCrawlErrors(
    @RequestParam(required = false) String platform,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    List<CrawlError> all;
    if (platform != null && !platform.isBlank() && !platform.equals("all")) {
        all = crawlErrorRepository.findByPlatformIgnoreCaseOrderByCrawledAtDesc(platform);
    } else {
        all = crawlErrorRepository.findAllByOrderByCrawledAtDesc();
    }

    int total = all.size();
    int from = page * size;
    int to = Math.min(from + size, total);
    List<CrawlError> paged = from >= total ? List.of() : all.subList(from, to);

    return ResponseEntity.ok()
        .header("X-Total-Count", String.valueOf(total))
        .body(paged);
}

@DeleteMapping("/crawler/errors/{id}")
public ResponseEntity<Void> deleteCrawlError(@PathVariable UUID id) {
    crawlErrorRepository.deleteById(id);
    return ResponseEntity.noContent().build();
}

@DeleteMapping("/crawler/errors")
public ResponseEntity<Void> deleteAllCrawlErrors(
    @RequestParam(required = false) String platform
) {
    if (platform != null && !platform.isBlank() && !platform.equals("all")) {
        crawlErrorRepository.deleteByPlatformIgnoreCase(platform);
    } else {
        crawlErrorRepository.deleteAll();
    }
    return ResponseEntity.noContent().build();
}
// ── Affiliate Clicks ───────────────────────────────────────────────────────

@GetMapping("/affiliate-clicks")
public ResponseEntity<Map<String, Object>> getAffiliateClicks(
    @RequestParam(required = false) String platform,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    // Danh sách clicks có phân trang
    List<AffiliateClick> all;
    if (platform != null && !platform.isBlank() && !platform.equals("all")) {
        all = affiliateClickRepository.findByPlatformOrderByClickedAtDesc(platform);
    } else {
        all = affiliateClickRepository.findAllOrderByClickedAtDesc();
    }

    int total = all.size();
    int from = page * size;
    int to = Math.min(from + size, total);
    List<AffiliateClick> paged = from >= total ? List.of() : all.subList(from, to);

    // Enrich với tên sản phẩm
    List<Map<String, Object>> rows = paged.stream().map(c -> {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", c.getId());
        row.put("clickedAt", c.getClickedAt());
        row.put("platform", c.getPlatform());
        row.put("userId", c.getUserId());
        row.put("productId", c.getProductId());
        // Lấy tên sản phẩm nếu có
        if (c.getProductId() != null) {
            productRepository.findById(c.getProductId())
                .ifPresent(p -> row.put("productName", p.getName()));
        }
        // Lấy email user nếu có
        if (c.getUserId() != null) {
            userRepository.findById(c.getUserId())
                .ifPresent(u -> row.put("userEmail", u.getEmail()));
        }
        return row;
    }).collect(Collectors.toList());

    // Thống kê theo sàn (30 ngày)
    LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
    List<Object[]> byPlatformRaw = affiliateClickRepository.countGroupByPlatformSince(thirtyDaysAgo);
    List<Map<String, Object>> byPlatform = byPlatformRaw.stream().map(r -> Map.of(
        "platform", r[0],
        "count", r[1]
    )).collect(Collectors.toList());

    // Thống kê theo ngày (30 ngày)
    List<Object[]> byDayRaw = affiliateClickRepository.countByDaySince(thirtyDaysAgo);
    List<Map<String, Object>> byDay = byDayRaw.stream().map(r -> Map.of(
        "day", r[0].toString(),
        "count", r[1]
    )).collect(Collectors.toList());

    // Top 5 sản phẩm
    List<Object[]> topRaw = affiliateClickRepository.topProductsSince(
        thirtyDaysAgo,
        org.springframework.data.domain.PageRequest.of(0, 5)
    );
    List<Map<String, Object>> topProducts = topRaw.stream().map(r -> {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("productId", r[0]);
        item.put("count", r[1]);
        if (r[0] != null) {
            try {
                productRepository.findById((UUID) r[0])
                    .ifPresent(p -> item.put("productName", p.getName()));
            } catch (Exception ignored) {}
        }
        return item;
    }).collect(Collectors.toList());

    return ResponseEntity.ok()
        .header("X-Total-Count", String.valueOf(total))
        .body(Map.of(
            "clicks", rows,
            "byPlatform", byPlatform,
            "byDay", byDay,
            "topProducts", topProducts,
            "totalClicks", total
        ));
}
    
}