package com.pricehawl.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler tự động refresh giá định kỳ - đa nền tảng.
 *
 * Cron chạy mỗi 15 phút nhưng service chỉ xử lý listing đến hạn:
 *   HIGH   : có price_alert → threshold 1h
 *   MEDIUM : wishlist       → threshold 6h
 *   LOW    : sản phẩm thường → threshold 24h
 */
@Component
public class PriceRefreshScheduler {

    private static final Logger log = LoggerFactory.getLogger(PriceRefreshScheduler.class);

    private final MultiPlatformPriceRefreshService refreshService;

    @Value("${pricehawk.scheduler.price-refresh.enabled:false}")
    private boolean schedulerEnabled;

    public PriceRefreshScheduler(MultiPlatformPriceRefreshService refreshService) {
        this.refreshService = refreshService;
    }

    @Scheduled(
            cron     = "${pricehawk.scheduler.price-refresh.cron:0 */15 * * * *}",
            zone     = "${pricehawk.scheduler.price-refresh.zone:Asia/Bangkok}"
    )
    public void runScheduledPriceRefresh() {
        if (!schedulerEnabled) {
            log.debug("PriceRefreshScheduler disabled. Skip.");
            return;
        }

        log.info("PriceRefreshScheduler started...");

        try {
            MultiPlatformPriceRefreshService.RefreshBatchResult batch =
                    refreshService.runScheduledRefresh();

            log.info(
                "PriceRefreshScheduler finished | total={} | inserted={} | skipped={} | failed={} | HIGH={} | MEDIUM={} | LOW={}",
                batch.totalSize(),
                batch.insertedCount(),
                batch.skippedCount(),
                batch.failedCount(),
                batch.highResults.size(),
                batch.mediumResults.size(),
                batch.lowResults.size()
            );

        } catch (Exception ex) {
            log.error("PriceRefreshScheduler crashed unexpectedly", ex);
        }
    }
}