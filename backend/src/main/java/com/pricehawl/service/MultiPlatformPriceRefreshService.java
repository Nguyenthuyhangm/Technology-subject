package com.pricehawl.service;

import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.service.crawler.PlatformPriceCrawler;
import com.pricehawl.service.model.PriceRefreshJobDTO;
import com.pricehawl.service.model.PriceRefreshResultDTO;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.*;

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
    private final TransactionTemplate transactionTemplate;
    private final Map<String, PlatformPriceCrawler> crawlerMap;

    @Value("${pricehawk.scheduler.price-refresh.max-items-per-run:50}")
    private int maxItemsPerRun;

    public MultiPlatformPriceRefreshService(
            ProductListingRepository productListingRepository,
            PriceRecordRepository priceRecordRepository,
            PriceRefreshDecisionService decisionService,
            AlertQueuePublisher alertQueuePublisher,
            PlatformTransactionManager transactionManager,
            List<PlatformPriceCrawler> crawlers
    ) {
        this.productListingRepository = productListingRepository;
        this.priceRecordRepository = priceRecordRepository;
        this.decisionService = decisionService;
        this.alertQueuePublisher = alertQueuePublisher;
        this.transactionTemplate = new TransactionTemplate(transactionManager);

        Map<String, PlatformPriceCrawler> map = new HashMap<>();
        for (PlatformPriceCrawler crawler : crawlers) {
            map.put(crawler.platformName().toLowerCase(), crawler);
        }
        this.crawlerMap = Collections.unmodifiableMap(map);

        log.info("MultiPlatformPriceRefreshService initialized with crawlers: {}", map.keySet());
    }

    // =========================
    // PUBLIC ENTRY POINTS
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
        return processListings(limit(listings), "HIGH");
    }

    public List<PriceRefreshResultDTO> runMediumPriority() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(MEDIUM_THRESHOLD_HOURS);
        List<ProductListing> listings = productListingRepository.findMediumPriorityListings(threshold);
        log.info("MEDIUM priority: found {} listings", listings.size());
        return processListings(limit(listings), "MEDIUM");
    }

    public List<PriceRefreshResultDTO> runLowPriority() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(LOW_THRESHOLD_HOURS);
        List<ProductListing> listings = productListingRepository.findLowPriorityListings(threshold);
        log.info("LOW priority: found {} listings", listings.size());
        return processListings(limit(listings), "LOW");
    }

    // =========================
    // INTERNAL FLOW
    // =========================

    private List<PriceRefreshResultDTO> processListings(List<ProductListing> listings, String priority) {
        if (listings.isEmpty()) return List.of();

        List<UUID> listingIds = listings.stream().map(ProductListing::getId).toList();
        Map<UUID, PriceRecord> latestRecordMap = loadLatestPriceRecords(listingIds);

        List<PriceRefreshResultDTO> results = new ArrayList<>();
        for (ProductListing listing : listings) {
            PriceRefreshResultDTO result = processSingleListing(listing, latestRecordMap, priority);
            results.add(result);
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
            return buildFailedResult(listing, priority,
                    new RuntimeException("No crawler for platform: " + platformName));
        }

        try {
            PriceSnapshotDTO snapshot = crawler.crawl(listing.getUrl());

            PriceRecord latestRecord = latestRecordMap.get(listing.getId());
            PriceRefreshJobDTO job = toJobDTO(listing, priority);
            PriceRefreshResultDTO result = decisionService.decide(job, snapshot, latestRecord);

            persistInTransaction(listing, snapshot, result);

            // Đẩy vào Redis queue thay vì gọi trực tiếp — crawler không bị chờ
            if (result.isInsertedNewPriceRecord() && snapshot.getPrice() != null) {
                try {
                    alertQueuePublisher.publish(
                        listing.getProduct().getId(),
                        snapshot.getPrice()
                    );
                } catch (Exception e) {
                    log.error("Failed to publish alert event for productId={}: {}",
                        listing.getProduct().getId(), e.getMessage());
                }
            }

            logResult(result, priority);
            return result;

        } catch (Exception ex) {
            log.error("Crawl failed | platform={} | listingId={} | url={} | error={}",
                    platformName, listing.getId(), listing.getUrl(), ex.getMessage());
            return buildFailedResult(listing, priority, ex);
        }
    }

    private void persistInTransaction(
            ProductListing listing,
            PriceSnapshotDTO snapshot,
            PriceRefreshResultDTO result
    ) {
        transactionTemplate.executeWithoutResult(status -> {
            ProductListing managed = productListingRepository.findById(listing.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "ProductListing not found: " + listing.getId()));

            if (result.isInsertedNewPriceRecord()) {
                PriceRecord record = PriceRecord.builder()
                        .productListing(managed)
                        .price(snapshot.getPrice() != null ? snapshot.getPrice() : 0)
                        .originalPrice(snapshot.getOriginalPrice())
                        .discountPct(snapshot.getDiscountPct() != null
                                ? snapshot.getDiscountPct().floatValue() : null)
                        .inStock(Boolean.TRUE.equals(snapshot.getInStock()))
                        .promotionLabel(snapshot.getStatusText())
                        .crawledAt(snapshot.getCrawledAt() != null
                                ? snapshot.getCrawledAt() : LocalDateTime.now())
                        .build();

                priceRecordRepository.save(record);

                managed.setCurrentPrice(snapshot.getPrice());
                managed.setOriginalPrice(snapshot.getOriginalPrice());
                managed.setDiscountPct(snapshot.getDiscountPct());
                managed.setInStock(snapshot.getInStock());
                managed.setPromotionLabel(snapshot.getStatusText());
            }

            managed.setCrawlTime(
                    snapshot.getCrawledAt() != null ? snapshot.getCrawledAt() : LocalDateTime.now());
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
                listing.getId(),
                listing.getProduct().getId(),
                listing.getUrl(),
                listing.getPlatformName(),
                "HIGH".equals(priority) || "MEDIUM".equals(priority),
                listing.getCrawlTime()
        );
    }

    private PriceRefreshResultDTO buildFailedResult(ProductListing listing,
                                                     String priority, Exception ex) {
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

        public int totalSize() {
            return highResults.size() + mediumResults.size() + lowResults.size();
        }

        public long insertedCount() {
            return allResults().stream().filter(PriceRefreshResultDTO::isInsertedNewPriceRecord).count();
        }

        public long failedCount() {
            return allResults().stream().filter(r -> !r.isCrawlSuccess()).count();
        }

        public long skippedCount() {
            return allResults().stream().filter(r -> "SKIPPED".equals(r.getAction())).count();
        }

        public List<PriceRefreshResultDTO> allResults() {
            List<PriceRefreshResultDTO> all = new ArrayList<>();
            all.addAll(highResults);
            all.addAll(mediumResults);
            all.addAll(lowResults);
            return all;
        }
    }
}