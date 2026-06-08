package com.pricehawl.service.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PriceRefreshResultDTOTest {

    @Test
    void shouldSetAndGetBasicJobFields() {
        UUID productListingId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        PriceRefreshResultDTO dto = new PriceRefreshResultDTO();

        dto.setProductListingId(productListingId);
        dto.setProductId(productId);
        dto.setUrl("https://example.com/product");
        dto.setPlatformName("cocolux");
        dto.setWishlistPriority(true);

        assertEquals(productListingId, dto.getProductListingId());
        assertEquals(productId, dto.getProductId());
        assertEquals("https://example.com/product", dto.getUrl());
        assertEquals("cocolux", dto.getPlatformName());
        assertTrue(dto.isWishlistPriority());
    }

    @Test
    void shouldSetAndGetRefreshResultFields() {
        LocalDateTime processedAt = LocalDateTime.of(2026, 6, 1, 15, 0);

        PriceRefreshResultDTO dto = new PriceRefreshResultDTO();

        dto.setCrawlSuccess(true);
        dto.setInsertedNewPriceRecord(true);
        dto.setAction("INSERTED");
        dto.setReason("Price changed");
        dto.setProcessedAt(processedAt);
        dto.setErrorMessage(null);

        assertTrue(dto.isCrawlSuccess());
        assertTrue(dto.isInsertedNewPriceRecord());
        assertEquals("INSERTED", dto.getAction());
        assertEquals("Price changed", dto.getReason());
        assertEquals(processedAt, dto.getProcessedAt());
        assertNull(dto.getErrorMessage());
    }

    @Test
    void shouldSetAndGetOldAndNewPriceFields() {
        PriceRefreshResultDTO dto = new PriceRefreshResultDTO();

        dto.setOldPrice(120000);
        dto.setOldOriginalPrice(150000);
        dto.setOldInStock(true);

        dto.setNewPrice(99000);
        dto.setNewOriginalPrice(150000);
        dto.setNewInStock(false);

        assertEquals(120000, dto.getOldPrice());
        assertEquals(150000, dto.getOldOriginalPrice());
        assertEquals(true, dto.getOldInStock());

        assertEquals(99000, dto.getNewPrice());
        assertEquals(150000, dto.getNewOriginalPrice());
        assertEquals(false, dto.getNewInStock());
    }

    @Test
    void shouldSupportFailedCrawlResult() {
        PriceRefreshResultDTO dto = new PriceRefreshResultDTO();

        dto.setCrawlSuccess(false);
        dto.setInsertedNewPriceRecord(false);
        dto.setAction("FAILED");
        dto.setReason("Crawler error");
        dto.setErrorMessage("Timeout when crawling product page");

        assertFalse(dto.isCrawlSuccess());
        assertFalse(dto.isInsertedNewPriceRecord());
        assertEquals("FAILED", dto.getAction());
        assertEquals("Crawler error", dto.getReason());
        assertEquals("Timeout when crawling product page", dto.getErrorMessage());
    }

    @Test
    void shouldIncludeImportantFieldsInToString() {
        UUID productListingId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        PriceRefreshResultDTO dto = new PriceRefreshResultDTO();
        dto.setProductListingId(productListingId);
        dto.setProductId(productId);
        dto.setUrl("https://example.com/product");
        dto.setPlatformName("watsons");
        dto.setWishlistPriority(true);
        dto.setCrawlSuccess(true);
        dto.setInsertedNewPriceRecord(false);
        dto.setAction("SKIPPED");
        dto.setReason("Price unchanged");
        dto.setOldPrice(100000);
        dto.setNewPrice(100000);

        String result = dto.toString();

        assertTrue(result.contains("PriceRefreshResultDTO"));
        assertTrue(result.contains(productListingId.toString()));
        assertTrue(result.contains(productId.toString()));
        assertTrue(result.contains("https://example.com/product"));
        assertTrue(result.contains("watsons"));
        assertTrue(result.contains("SKIPPED"));
        assertTrue(result.contains("Price unchanged"));
        assertTrue(result.contains("oldPrice=100000"));
        assertTrue(result.contains("newPrice=100000"));
    }
}