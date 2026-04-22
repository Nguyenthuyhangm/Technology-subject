package com.pricehawl.service;

import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductListingRepository;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Orchestrator chính cho auto refresh giá.
 *
 * Production-ready notes:
 * - KHÔNG giữ 1 transaction cho cả batch
 * - Mỗi listing được persist trong transaction riêng
 * - Crawl Node chạy ngoài transaction để tránh giữ DB transaction quá lâu
 * - 1 listing lỗi không làm hỏng cả batch
 */
@Service
public class PriceRefreshServiceImpl implements PriceRefreshService {

    private static final Logger log = LoggerFactory.getLogger(PriceRefreshServiceImpl.class);

    private static final String COCOLUX_PLATFORM_NAME = "cocolux";
    private static final long WISHLIST_HOURS = 3L;
    private static final long NORMAL_HOURS = 24L;

    private final ProductListingRepository productListingRepository;
    private final PriceRecordRepository priceRecordRepository;
    private final CocoluxPriceCrawlerService cocoluxPriceCrawlerService;
    private final PriceRefreshDecisionService priceRefreshDecisionService;
    private final TransactionTemplate transactionTemplate;

    /**
     * Giới hạn số listing xử lý trong 1 lần chạy.
     * Đặc biệt hữu ích cho run-normal để tránh request quá nặng.
     */
    @Value("${pricehawk.scheduler.price-refresh.max-items-per-run:20}")
    private int maxItemsPerRun;

    public PriceRefreshServiceImpl(
            ProductListingRepository productListingRepository,
            PriceRecordRepository priceRecordRepository,
            CocoluxPriceCrawlerService cocoluxPriceCrawlerService,
            PriceRefreshDecisionService priceRefreshDecisionService,
            PlatformTransactionManager transactionManager
    ) {
        this.productListingRepository = productListingRepository;
        this.priceRecordRepository = priceRecordRepository;
        this.cocoluxPriceCrawlerService = cocoluxPriceCrawlerService;
        this.priceRefreshDecisionService = priceRefreshDecisionService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public List<PriceRefreshResultDTO> runScheduledRefresh() {
        List<PriceRefreshResultDTO> results = new ArrayList<>();
        results.addAll(runWishlistRefresh());
        results.addAll(runNormalRefresh());
        return results;
    }

    @Override
    public List<PriceRefreshResultDTO> runWishlistRefresh() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(WISHLIST_HOURS);

        List<ProductListing> listings = productListingRepository.findListingsForWishlistRefresh(
                COCOLUX_PLATFORM_NAME,
                threshold
        );

        List<ProductListing> limitedListings = limitListings(listings);

        log.info(
                "Price refresh wishlist: found {} listings, processing {} listings",
                listings.size(),
                limitedListings.size()
        );

        return processListings(limitedListings, true);
    }

    @Override
    public List<PriceRefreshResultDTO> runNormalRefresh() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(NORMAL_HOURS);

        List<ProductListing> listings = productListingRepository.findListingsForNormalRefresh(
                COCOLUX_PLATFORM_NAME,
                threshold
        );

        List<ProductListing> limitedListings = limitListings(listings);

        log.info(
                "Price refresh normal: found {} listings, processing {} listings",
                listings.size(),
                limitedListings.size()
        );

        return processListings(limitedListings, false);
    }

    @Override
    public PriceRefreshResultDTO refreshOneListing(PriceRefreshJobDTO job) {
        if (job == null) {
            PriceRefreshResultDTO result = new PriceRefreshResultDTO();
            result.setAction("FAILED");
            result.setReason("JOB_NULL");
            result.setErrorMessage("PriceRefreshJobDTO must not be null");
            result.setProcessedAt(LocalDateTime.now());
            return result;
        }

        PriceRecord latestRecord = priceRecordRepository
                .findLatestByProductListingId(job.getProductListingId())
                .orElse(null);

        return processSingleJob(job, latestRecord);
    }

    // =========================
    // INTERNAL FLOW
    // =========================

    private List<ProductListing> limitListings(List<ProductListing> listings) {
        if (listings == null || listings.isEmpty()) {
            return List.of();
        }

        if (maxItemsPerRun <= 0 || listings.size() <= maxItemsPerRun) {
            return listings;
        }

        return listings.subList(0, maxItemsPerRun);
    }

    private List<PriceRefreshResultDTO> processListings(
            List<ProductListing> listings,
            boolean wishlistPriority
    ) {
        List<PriceRefreshResultDTO> results = new ArrayList<>();

        if (listings == null || listings.isEmpty()) {
            return results;
        }

        Map<UUID, PriceRecord> latestRecordMap = loadLatestPriceRecords(listings);

        for (ProductListing listing : listings) {
            PriceRefreshJobDTO job = toJobDTO(listing, wishlistPriority);
            PriceRecord latestRecord = latestRecordMap.get(job.getProductListingId());

            PriceRefreshResultDTO result = processSingleJob(job, latestRecord);
            results.add(result);
        }

        return results;
    }

    /**
     * Xử lý 1 listing trọn vẹn.
     *
     * Quan trọng:
     * - crawl ngoài transaction
     * - persist DB trong transaction riêng
     */
    private PriceRefreshResultDTO processSingleJob(PriceRefreshJobDTO job, PriceRecord latestRecord) {
        try {
            // 1) Crawl ngoài transaction
            PriceSnapshotDTO snapshot = cocoluxPriceCrawlerService.crawlPriceSnapshot(job.getUrl());

            // 2) Decision ngoài transaction
            PriceRefreshResultDTO result =
                    priceRefreshDecisionService.decide(job, snapshot, latestRecord);

            // 3) Persist trong transaction riêng
            persistOutcomeInIsolatedTransaction(job, snapshot, result);

            logResult(result);
            return result;

        } catch (Exception ex) {
            PriceRefreshResultDTO failed = buildFailedResult(job, ex);
            log.error(
                    "Price refresh failed for listingId={}, url={}",
                    job.getProductListingId(),
                    job.getUrl(),
                    ex
            );
            return failed;
        }
    }

    private Map<UUID, PriceRecord> loadLatestPriceRecords(List<ProductListing> listings) {
        List<UUID> listingIds = listings.stream()
                .map(ProductListing::getId)
                .toList();

        List<PriceRecord> latestRecords = priceRecordRepository.findLatestByProductListingIdIn(listingIds);

        Map<UUID, PriceRecord> map = new LinkedHashMap<>();
        for (PriceRecord record : latestRecords) {
            UUID listingId = record.getProductListing().getId();
            map.putIfAbsent(listingId, record);
        }
        return map;
    }

    private PriceRefreshJobDTO toJobDTO(ProductListing listing, boolean wishlistPriority) {
        return new PriceRefreshJobDTO(
                listing.getId(),
                listing.getProduct().getId(),
                listing.getUrl(),
                listing.getPlatformName(),
                wishlistPriority,
                listing.getCrawlTime()
        );
    }

    /**
     * Transaction riêng cho từng listing.
     * Nếu 1 listing fail lúc persist, listing khác vẫn tiếp tục.
     */
    private void persistOutcomeInIsolatedTransaction(
            PriceRefreshJobDTO job,
            PriceSnapshotDTO snapshot,
            PriceRefreshResultDTO result
    ) {
        transactionTemplate.executeWithoutResult(status -> {
            ProductListing listing = productListingRepository.findById(job.getProductListingId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "ProductListing not found for id=" + job.getProductListingId()
                    ));

            if (result.isInsertedNewPriceRecord()) {
                PriceRecord record = new PriceRecord();
                record.setProductListing(listing);
                record.setPrice(snapshot.getPrice() != null ? snapshot.getPrice() : 0);
                record.setOriginalPrice(snapshot.getOriginalPrice());
                record.setDiscountPct(
                        snapshot.getDiscountPct() != null ? snapshot.getDiscountPct().floatValue() : null
                );
                record.setInStock(Boolean.TRUE.equals(snapshot.getInStock()));
                record.setPromotionLabel(snapshot.getStatusText());
                record.setCrawledAt(
                        snapshot.getCrawledAt() != null ? snapshot.getCrawledAt() : LocalDateTime.now()
                );

                priceRecordRepository.save(record);
            }

            // Crawl thành công thì luôn update crawl_time,
            // kể cả khi action = SKIPPED
            listing.setCrawlTime(
                    snapshot.getCrawledAt() != null ? snapshot.getCrawledAt() : LocalDateTime.now()
            );
            productListingRepository.save(listing);
        });
    }

    private PriceRefreshResultDTO buildFailedResult(PriceRefreshJobDTO job, Exception ex) {
        PriceRefreshResultDTO failed = new PriceRefreshResultDTO();
        failed.setProductListingId(job.getProductListingId());
        failed.setProductId(job.getProductId());
        failed.setUrl(job.getUrl());
        failed.setPlatformName(job.getPlatformName());
        failed.setWishlistPriority(job.isWishlistPriority());
        failed.setCrawlSuccess(false);
        failed.setInsertedNewPriceRecord(false);
        failed.setAction("FAILED");
        failed.setReason("EXCEPTION_DURING_REFRESH");
        failed.setErrorMessage(ex.getMessage());
        failed.setProcessedAt(LocalDateTime.now());
        return failed;
    }

    private void logResult(PriceRefreshResultDTO result) {
        if (result == null) {
            return;
        }

        log.info(
                "Price refresh result | action={} | reason={} | listingId={} | productId={} | wishlist={} | oldPrice={} | newPrice={} | oldOriginal={} | newOriginal={} | oldStock={} | newStock={} | url={}",
                result.getAction(),
                result.getReason(),
                result.getProductListingId(),
                result.getProductId(),
                result.isWishlistPriority(),
                result.getOldPrice(),
                result.getNewPrice(),
                result.getOldOriginalPrice(),
                result.getNewOriginalPrice(),
                result.getOldInStock(),
                result.getNewInStock(),
                result.getUrl()
        );
    }
}