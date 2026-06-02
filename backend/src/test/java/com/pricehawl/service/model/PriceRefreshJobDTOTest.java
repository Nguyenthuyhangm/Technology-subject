package com.pricehawl.service.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PriceRefreshJobDTOTest {

    @Test
    void shouldCreateJobDtoWithNoArgsConstructorAndSetters() {
        UUID productListingId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        LocalDateTime lastCrawlTime = LocalDateTime.of(2026, 6, 1, 13, 0);

        PriceRefreshJobDTO dto = new PriceRefreshJobDTO();

        dto.setProductListingId(productListingId);
        dto.setProductId(productId);
        dto.setUrl("https://example.com/product");
        dto.setPlatformName("cocolux");
        dto.setWishlistPriority(true);
        dto.setLastCrawlTime(lastCrawlTime);

        assertEquals(productListingId, dto.getProductListingId());
        assertEquals(productId, dto.getProductId());
        assertEquals("https://example.com/product", dto.getUrl());
        assertEquals("cocolux", dto.getPlatformName());
        assertTrue(dto.isWishlistPriority());
        assertEquals(lastCrawlTime, dto.getLastCrawlTime());
    }

    @Test
    void shouldCreateJobDtoWithAllArgsConstructor() {
        UUID productListingId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        LocalDateTime lastCrawlTime = LocalDateTime.of(2026, 6, 1, 13, 30);

        PriceRefreshJobDTO dto = new PriceRefreshJobDTO(
                productListingId,
                productId,
                "https://watsons.vn/product/1",
                "watsons",
                false,
                lastCrawlTime
        );

        assertEquals(productListingId, dto.getProductListingId());
        assertEquals(productId, dto.getProductId());
        assertEquals("https://watsons.vn/product/1", dto.getUrl());
        assertEquals("watsons", dto.getPlatformName());
        assertFalse(dto.isWishlistPriority());
        assertEquals(lastCrawlTime, dto.getLastCrawlTime());
    }

    @Test
    void shouldIncludeImportantFieldsInToString() {
        UUID productListingId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        LocalDateTime lastCrawlTime = LocalDateTime.of(2026, 6, 1, 14, 0);

        PriceRefreshJobDTO dto = new PriceRefreshJobDTO(
                productListingId,
                productId,
                "https://example.com/item",
                "hasaki",
                true,
                lastCrawlTime
        );

        String result = dto.toString();

        assertTrue(result.contains("PriceRefreshJobDTO"));
        assertTrue(result.contains(productListingId.toString()));
        assertTrue(result.contains(productId.toString()));
        assertTrue(result.contains("https://example.com/item"));
        assertTrue(result.contains("hasaki"));
        assertTrue(result.contains("wishlistPriority=true"));
    }
}