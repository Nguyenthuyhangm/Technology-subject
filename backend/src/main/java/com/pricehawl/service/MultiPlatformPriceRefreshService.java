package com.pricehawl.service;

import com.pricehawl.entity.CrawlError;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.CrawlErrorRepository;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.service.crawler.CrawlerRateLimiter;
import com.pricehawl.service.crawler.PlatformPriceCrawler;
import com.pricehawl.service.model.PriceRefreshJobDTO;
import com.pricehawl.service.model.PriceRefreshResultDTO;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import jakarta.annotation.PreDestroy;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

@Service
public class MultiPlatformPriceRefreshService {

    private static final Logger log = LoggerFactory.getLogger(MultiPlatformPriceRefreshService.class);

    private static final long HIGH_THRESHOLD_HOURS   = 1L;
    private static final long MEDIUM_THRESHOLD_HOURS = 6L;
    private static final long LOW_THRESHOLD_HOURS    = 24L;

    private final ProductListingRepository productListingRepository;
    private final PriceRecordRepository priceRecordRepository;
    private final PriceRefreshDecisionService decisionService;
    private final AlertQueuePublisher alertQueuePublisher;
    private final CrawlErrorRepository crawlErrorRepository;
    private final TransactionTemplate transactionTemplate;
    private final CrawlerRateLimiter rateLimiter;
    private final Map<String, PlatformPriceCrawler> crawlerMap;
    private final ExecutorService crawlerPool;

    @Value("${pricehawk.scheduler.price-refresh.max-items-per-run:50}")
    private int maxItemsPerRun;

    public MultiPlatformPriceRefreshService(
            ProductListingRepository productListingRepository,
            PriceRecordRepository priceRecordRepository,
            PriceRefreshDecisionService decisionService,
            AlertQueuePublisher alertQueuePublisher,
            CrawlErrorRepository crawlErrorRepository,
            PlatformTransactionManager transactionManager,
            CrawlerRateLimiter rateLimiter,
            List<PlatformPriceCrawler> crawlers
    ) {
        this.productListingRepository = productListingRepository;
        this.priceRecordRepository = priceRecordRepository;
        this.decisionService = decisionService;
        this.alertQueuePublisher = alertQueuePublisher;
        this.crawlErrorRepository = crawlErrorRepository;
        this.rateLimiter = rateLimiter;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.crawlerPool = Executors.newFixedThreadPool(5);

        Map<String, PlatformPriceCrawler> map = new HashMap<>();
        for (PlatformPriceCrawler crawler : crawlers) {
            map.put(crawler.platformName().toLowerCase(), crawler);
        }
        this.crawlerMap = Collections.unmodifiableMap(map);

        log.info("MultiPlatformPriceRefreshService initialized with crawlers: {}", map.keySet());
    }

    @PreDestroy
    public void shutdown() {
        crawlerPool.shutdown();
        try {
            if (!crawlerPool.awaitTermination(60, TimeUnit.SECONDS)) {
                crawlerPool.shutdownNow();
            }
        } catch (InterruptedException e) {
            crawlerPool.shutdownNow();
        }
    }

    // =========================
    // PUBLIC ENTRY POINTS - SCHEDULED (có filter crawl_time)
    // =========================

    public RefreshBatchResult runScheduledRefresh() {
        RefreshBatchResult batch = new RefreshBatchResult();
        batch.highResults   = runHighPriority();
        batch.mediumResults = runMediumPriority();
        batch.lowResults    = runLowPriority();
        return batch;
    }

    public List<PriceRefreshResultDTO> runHighPriority() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(HIGH_THRESHOLD_HOURS);
        List<ProductListing> listings = productListingRepository.findHighPriorityListings(threshold);
        log.info("HIGH priority: found {} listings", listings.size());
        return processListingsParallel(limit(listings), "HIGH");
    }

    public List<PriceRefreshResultDTO> runMediumPriority() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(MEDIUM_THRESHOLD_HOURS);
        List<ProductListing> listings = productListingRepository.findMediumPriorityListings(threshold);
        log.info("MEDIUM priority: found {} listings", listings.size());
        return processListingsParallel(limit(listings), "MEDIUM");
    }

    public List<PriceRefreshResultDTO> runLowPriority() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(LOW_THRESHOLD_HOURS);
        List<ProductListing> listings = productListingRepository.findLowPriorityListings(threshold);
        log.info("LOW priority: found {} listings", listings.size());
        return processListingsParallel(limit(listings), "LOW");
    }

    // =========================
    // PUBLIC ENTRY POINTS - FORCE (crawl TẤT CẢ, không filter crawl_time)
    // Dùng khi admin bấm Trigger thủ công
    // =========================

    public List<PriceRefreshResultDTO> runHighPriorityForce() {
        List<ProductListing> listings = productListingRepository.findAllHighPriorityListings();
        log.info("HIGH priority FORCE: found {} listings", listings.size());
        return processListingsParallel(limit(listings), "HIGH");
    }

    public List<PriceRefreshResultDTO> runMediumPriorityForce() {
        List<ProductListing> listings = productListingRepository.findAllMediumPriorityListings();
        log.info("MEDIUM priority FORCE: found {} listings", listings.size());
        return processListingsParallel(limit(listings), "MEDIUM");
    }

    public List<PriceRefreshResultDTO> runLowPriorityForce() {
        List<ProductListing> listings = productListingRepository.findAllLowPriorityListings();
        log.info("LOW priority FORCE: found {} listings", listings.size());
        return processListingsParallel(limit(listings), "LOW");
    }

    // =========================
    // ĐA LUỒNG
    // =========================

    private List<PriceRefreshResultDTO> processListingsParallel(
            List<ProductListing> listings, String priority) {
        if (listings.isEmpty()) return List.of();

        List<UUID> listingIds = listings.stream().map(ProductListing::getId).toList();
        Map<UUID, PriceRecord> latestRecordMap = loadLatestPriceRecords(listingIds);

        List<Future<PriceRefreshResultDTO>> futures = new ArrayList<>();
        for (ProductListing listing : listings) {
            Future<PriceRefreshResultDTO> future = crawlerPool.submit(() ->
                processSingleListing(listing, latestRecordMap, priority)
            );
            futures.add(future);
        }

        List<PriceRefreshResultDTO> results = new ArrayList<>();
        for (Future<PriceRefreshResultDTO> future : futures) {
            try {
                results.add(future.get(120, TimeUnit.SECONDS));
            } catch (TimeoutException e) {
                log.error("Crawler task timeout after 120s");
                results.add(buildTimeoutResult(priority));
                future.cancel(true);
            } catch (Exception e) {
                log.error("Crawler task failed: {}", e.getMessage());
            }
        }

        return results;
    }

    private PriceRefreshResultDTO processSingleListing(
            ProductListing listing,
            Map<UUID, PriceRecord> latestRecordMap,
            String priority
    ) {
        String platformName = listing.getPlatformName().toLowerCase();
        PlatformPriceCrawler crawler = crawlerMap.get(platformName);

        if (crawler == null) {
            log.warn("No crawler for platform='{}', listingId={}", platformName, listing.getId());
            saveCrawlError(listing, "OTHER", "No crawler for platform: " + platformName);
            return buildFailedResult(listing, priority,
                    new RuntimeException("No crawler for platform: " + platformName));
        }

        try {
            rateLimiter.acquire(platformName);
            PriceSnapshotDTO snapshot = crawler.crawl(listing.getUrl());

            PriceRecord latestRecord = latestRecordMap.get(listing.getId());
            PriceRefreshJobDTO job = toJobDTO(listing, priority);
            PriceRefreshResultDTO result = decisionService.decide(job, snapshot, latestRecord);

            persistInTransaction(listing, snapshot, result);

            if (result.isInsertedNewPriceRecord() && snapshot.getPrice() != null) {
                try {
                    alertQueuePublisher.publish(listing.getProduct().getId(), snapshot.getPrice());
                } catch (Exception e) {
                    log.error("Failed to publish alert event: {}", e.getMessage());
                }
            }

            logResult(result, priority);
            return result;

        } catch (Exception ex) {
            String errorMsg = ex.getMessage() != null ? ex.getMessage() : "";
            String errorType = detectErrorType(errorMsg);

            transactionTemplate.executeWithoutResult(s -> {
                productListingRepository.findById(listing.getId()).ifPresent(managed -> {
                    managed.setCrawlTime(LocalDateTime.now());
                    productListingRepository.save(managed);
                });
            });

            if (errorMsg.contains("404") || errorMsg.toLowerCase().contains("not found")) {
                log.info("Listing 404 → out of stock | platform={} | url={}", platformName, listing.getUrl());
                markOutOfStock(listing);

                PriceRefreshResultDTO r = new PriceRefreshResultDTO();
                r.setProductListingId(listing.getId());
                r.setProductId(listing.getProduct().getId());
                r.setUrl(listing.getUrl());
                r.setPlatformName(listing.getPlatformName());
                r.setWishlistPriority("MEDIUM".equals(priority));
                r.setCrawlSuccess(true);
                r.setInsertedNewPriceRecord(false);
                r.setAction("OUT_OF_STOCK");
                r.setReason("PRODUCT_404");
                r.setProcessedAt(LocalDateTime.now());
                return r;
            }

            log.error("Crawl failed | platform={} | listingId={} | url={} | error={}",
                    platformName, listing.getId(), listing.getUrl(), errorMsg);

            saveCrawlError(listing, errorType, errorMsg);
            return buildFailedResult(listing, priority, ex);
        }
    }

    // =========================
    // DETECT ERROR TYPE
    // =========================

    private String detectErrorType(String errorMsg) {
        if (errorMsg == null) return "OTHER";
        String lower = errorMsg.toLowerCase();
        if (lower.contains("timeout") || lower.contains("timed out")) return "TIMEOUT";
        if (lower.contains("403") || lower.contains("blocked") || lower.contains("forbidden")) return "BLOCKED";
        if (lower.contains("captcha")) return "CAPTCHA";
        if (lower.contains("404") || lower.contains("not found")) return "NOT_FOUND";
        if (lower.contains("html") || lower.contains("parse") || lower.contains("selector")) return "HTML_CHANGED";
        return "OTHER";
    }

    // =========================
    // SAVE CRAWL ERROR ASYNC
    // =========================

    @Async
    public void saveCrawlError(ProductListing listing, String errorType, String errorMessage) {
        try {
            String productName = null;
            try { productName = listing.getProduct().getName(); } catch (Exception ignored) {}

            CrawlError error = CrawlError.builder()
                .platform(listing.getPlatformName())
                .productListingId(listing.getId())
                .productName(productName)
                .url(listing.getUrl())
                .errorType(errorType)
                .errorMessage(errorMessage != null && errorMessage.length() > 500
                    ? errorMessage.substring(0, 500) : errorMessage)
                .crawledAt(LocalDateTime.now())
                .build();
            crawlErrorRepository.save(error);
        } catch (Exception e) {
            log.error("Failed to save crawl error: {}", e.getMessage());
        }
    }

    // =========================
    // PERSIST
    // =========================

    private void markOutOfStock(ProductListing listing) {
        transactionTemplate.executeWithoutResult(status -> {
            ProductListing managed = productListingRepository.findById(listing.getId()).orElse(null);
            if (managed != null) {
                managed.setInStock(false);
                managed.setStatus("out_of_stock");
                managed.setCrawlTime(LocalDateTime.now());
                productListingRepository.save(managed);
                log.info("Marked out_of_stock | id={} | url={}", managed.getId(), managed.getUrl());
            }
        });
    }

    private void persistInTransaction(ProductListing listing, PriceSnapshotDTO snapshot, PriceRefreshResultDTO result) {
        transactionTemplate.executeWithoutResult(status -> {
            ProductListing managed = productListingRepository.findById(listing.getId())
                    .orElseThrow(() -> new IllegalStateException("ProductListing not found: " + listing.getId()));

            if (result.isInsertedNewPriceRecord()) {
                PriceRecord record = PriceRecord.builder()
                        .productListing(managed)
                        .price(snapshot.getPrice() != null ? snapshot.getPrice() : 0)
                        .originalPrice(snapshot.getOriginalPrice())
                        .discountPct(snapshot.getDiscountPct() != null ? snapshot.getDiscountPct().floatValue() : null)
                        .inStock(Boolean.TRUE.equals(snapshot.getInStock()))
                        .promotionLabel(snapshot.getStatusText())
                        .crawledAt(snapshot.getCrawledAt() != null ? snapshot.getCrawledAt() : LocalDateTime.now())
                        .build();
                priceRecordRepository.save(record);

                managed.setCurrentPrice(snapshot.getPrice());
                managed.setOriginalPrice(snapshot.getOriginalPrice());
                managed.setDiscountPct(snapshot.getDiscountPct());
                managed.setInStock(snapshot.getInStock());
                managed.setPromotionLabel(snapshot.getStatusText());

                if (!"hidden".equals(managed.getStatus())) {
                    managed.setStatus("active");
                }
            }

            managed.setCrawlTime(LocalDateTime.now());

            productListingRepository.save(managed);
        });
    }

    // =========================
    // HELPERS
    // =========================

    private List<ProductListing> limit(List<ProductListing> listings) {
        if (maxItemsPerRun <= 0 || listings.size() <= maxItemsPerRun) return listings;
        return listings.subList(0, maxItemsPerRun);
    }

    private Map<UUID, PriceRecord> loadLatestPriceRecords(List<UUID> listingIds) {
        List<PriceRecord> records = priceRecordRepository.findLatestByProductListingIdIn(listingIds);
        Map<UUID, PriceRecord> map = new LinkedHashMap<>();
        for (PriceRecord r : records) {
            map.putIfAbsent(r.getProductListing().getId(), r);
        }
        return map;
    }

    private PriceRefreshJobDTO toJobDTO(ProductListing listing, String priority) {
        return new PriceRefreshJobDTO(
                listing.getId(), listing.getProduct().getId(), listing.getUrl(),
                listing.getPlatformName(), "HIGH".equals(priority) || "MEDIUM".equals(priority),
                listing.getCrawlTime());
    }

    private PriceRefreshResultDTO buildFailedResult(ProductListing listing, String priority, Exception ex) {
        PriceRefreshResultDTO r = new PriceRefreshResultDTO();
        r.setProductListingId(listing.getId());
        r.setProductId(listing.getProduct().getId());
        r.setUrl(listing.getUrl());
        r.setPlatformName(listing.getPlatformName());
        r.setWishlistPriority("MEDIUM".equals(priority));
        r.setCrawlSuccess(false);
        r.setInsertedNewPriceRecord(false);
        r.setAction("FAILED");
        r.setReason("EXCEPTION_DURING_REFRESH");
        r.setErrorMessage(ex.getMessage());
        r.setProcessedAt(LocalDateTime.now());
        return r;
    }

    private PriceRefreshResultDTO buildTimeoutResult(String priority) {
        PriceRefreshResultDTO r = new PriceRefreshResultDTO();
        r.setCrawlSuccess(false);
        r.setInsertedNewPriceRecord(false);
        r.setAction("FAILED");
        r.setReason("TIMEOUT");
        r.setErrorMessage("Crawler task timeout");
        r.setProcessedAt(LocalDateTime.now());
        r.setWishlistPriority("MEDIUM".equals(priority));
        return r;
    }

    private void logResult(PriceRefreshResultDTO r, String priority) {
        log.info("Refresh {} | action={} | reason={} | platform={} | price={} → {} | url={}",
                priority, r.getAction(), r.getReason(), r.getPlatformName(),
                r.getOldPrice(), r.getNewPrice(), r.getUrl());
    }

    // =========================
    // RESULT WRAPPER
    // =========================

    public static class RefreshBatchResult {
        public List<PriceRefreshResultDTO> highResults   = new ArrayList<>();
        public List<PriceRefreshResultDTO> mediumResults = new ArrayList<>();
        public List<PriceRefreshResultDTO> lowResults    = new ArrayList<>();

        public int totalSize() { return highResults.size() + mediumResults.size() + lowResults.size(); }
        public long insertedCount() { return allResults().stream().filter(PriceRefreshResultDTO::isInsertedNewPriceRecord).count(); }
        public long failedCount() { return allResults().stream().filter(r -> !r.isCrawlSuccess()).count(); }
        public long skippedCount() { return allResults().stream().filter(r -> "SKIPPED".equals(r.getAction())).count(); }
        public long outOfStockCount() { return allResults().stream().filter(r -> "OUT_OF_STOCK".equals(r.getAction())).count(); }

        public List<PriceRefreshResultDTO> allResults() {
            List<PriceRefreshResultDTO> all = new ArrayList<>();
            all.addAll(highResults); all.addAll(mediumResults); all.addAll(lowResults);
            return all;
        }
    }
}