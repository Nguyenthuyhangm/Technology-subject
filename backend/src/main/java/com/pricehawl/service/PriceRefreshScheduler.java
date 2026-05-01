package com.pricehawl.service;

import com.pricehawl.service.model.PriceRefreshResultDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Scheduler tự động chạy refresh giá định kỳ.
 *
 * Ý tưởng:
 * - Mỗi 30 phút chạy 1 lần
 * - Nhưng service chỉ xử lý listing nào đã đến hạn:
 *   + wishlist: quá 3h
 *   + normal: quá 24h
 *
 * Nên dù scheduler chạy mỗi 30 phút,
 * không có nghĩa là mọi listing bị crawl mỗi 30 phút.
 */
@Component
public class PriceRefreshScheduler {

    private static final Logger log = LoggerFactory.getLogger(PriceRefreshScheduler.class);

    private final PriceRefreshService priceRefreshService;

    @Value("${pricehawk.scheduler.price-refresh.enabled:false}")
    private boolean schedulerEnabled;

    public PriceRefreshScheduler(PriceRefreshService priceRefreshService) {
        this.priceRefreshService = priceRefreshService;
    }

    @Scheduled(
            cron = "${pricehawk.scheduler.price-refresh.cron:0 */30 * * * *}",
            zone = "${pricehawk.scheduler.price-refresh.zone:Asia/Bangkok}"
    )
    public void runScheduledPriceRefresh() {
        if (!schedulerEnabled) {
            log.info("PriceRefreshScheduler is disabled. Skip this run.");
            return;
        }

        log.info("PriceRefreshScheduler started...");

        try {
            List<PriceRefreshResultDTO> results = priceRefreshService.runScheduledRefresh();

            long insertedCount = results.stream()
                    .filter(PriceRefreshResultDTO::isInsertedNewPriceRecord)
                    .count();

            long failedCount = results.stream()
                    .filter(r -> !r.isCrawlSuccess())
                    .count();

            long skippedCount = results.stream()
                    .filter(r -> "SKIPPED".equals(r.getAction()))
                    .count();

            log.info(
                    "PriceRefreshScheduler finished. total={}, inserted={}, skipped={}, failed={}",
                    results.size(),
                    insertedCount,
                    skippedCount,
                    failedCount
            );

        } catch (Exception ex) {
            log.error("PriceRefreshScheduler failed unexpectedly", ex);
        }
    }
}