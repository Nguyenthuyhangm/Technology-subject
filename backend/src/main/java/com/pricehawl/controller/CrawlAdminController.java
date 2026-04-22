package com.pricehawl.controller;

import com.pricehawl.service.PriceRefreshService;
import com.pricehawl.service.model.PriceRefreshResultDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller để chạy tay auto refresh giá.
 *
 * Dùng cho giai đoạn dev/test:
 * - không cần chờ scheduler
 * - bấm endpoint là chạy được ngay
 */
@RestController
@RequestMapping("/admin/crawl")
public class CrawlAdminController {

    private final PriceRefreshService priceRefreshService;

    public CrawlAdminController(PriceRefreshService priceRefreshService) {
        this.priceRefreshService = priceRefreshService;
    }

    /**
     * Chạy toàn bộ:
     * - wishlist Cocolux 3h
     * - non-wishlist Cocolux 24h
     */
    @PostMapping("/refresh-prices/run")
    public ResponseEntity<List<PriceRefreshResultDTO>> runAll() {
        List<PriceRefreshResultDTO> results = priceRefreshService.runScheduledRefresh();
        return ResponseEntity.ok(results);
    }

    /**
     * Chỉ chạy nhóm wishlist.
     */
    @PostMapping("/refresh-prices/run-wishlist")
    public ResponseEntity<List<PriceRefreshResultDTO>> runWishlist() {
        List<PriceRefreshResultDTO> results = priceRefreshService.runWishlistRefresh();
        return ResponseEntity.ok(results);
    }

    /**
     * Chỉ chạy nhóm normal.
     */
    @PostMapping("/refresh-prices/run-normal")
    public ResponseEntity<List<PriceRefreshResultDTO>> runNormal() {
        List<PriceRefreshResultDTO> results = priceRefreshService.runNormalRefresh();
        return ResponseEntity.ok(results);
    }
}