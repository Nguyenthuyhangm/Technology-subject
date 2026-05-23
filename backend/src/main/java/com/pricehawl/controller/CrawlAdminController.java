package com.pricehawl.controller;

import com.pricehawl.service.AlertQueuePublisher;
import com.pricehawl.service.MultiPlatformPriceRefreshService;
import com.pricehawl.service.MultiPlatformPriceRefreshService.RefreshBatchResult;
import com.pricehawl.service.model.PriceRefreshResultDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/crawl")
public class CrawlAdminController {

    private final MultiPlatformPriceRefreshService refreshService;
    private final AlertQueuePublisher alertQueuePublisher;

    public CrawlAdminController(
        MultiPlatformPriceRefreshService refreshService,
        AlertQueuePublisher alertQueuePublisher
    ) {
        this.refreshService = refreshService;
        this.alertQueuePublisher = alertQueuePublisher;
    }

    @PostMapping("/refresh-prices/run")
    public ResponseEntity<Map<String, Object>> runAll() {
        RefreshBatchResult batch = refreshService.runScheduledRefresh();
        return ResponseEntity.ok(Map.of(
            "total",    batch.totalSize(),
            "inserted", batch.insertedCount(),
            "skipped",  batch.skippedCount(),
            "failed",   batch.failedCount(),
            "high",     batch.highResults,
            "medium",   batch.mediumResults,
            "low",      batch.lowResults
        ));
    }

    @PostMapping("/refresh-prices/run-high")
    public ResponseEntity<List<PriceRefreshResultDTO>> runHigh() {
        return ResponseEntity.ok(refreshService.runHighPriority());
    }

    @PostMapping("/refresh-prices/run-medium")
    public ResponseEntity<List<PriceRefreshResultDTO>> runMedium() {
        return ResponseEntity.ok(refreshService.runMediumPriority());
    }

    @PostMapping("/refresh-prices/run-low")
    public ResponseEntity<List<PriceRefreshResultDTO>> runLow() {
        return ResponseEntity.ok(refreshService.runLowPriority());
    }

    /** Test Redis queue — đẩy message vào queue thủ công */
    @PostMapping("/test-queue/{productId}/{price}")
    public ResponseEntity<String> testQueue(
        @PathVariable UUID productId,
        @PathVariable int price
    ) {
        alertQueuePublisher.publish(productId, price);
        return ResponseEntity.ok("Published to queue! Check logs for 'Alert queue processed'");
    }
}