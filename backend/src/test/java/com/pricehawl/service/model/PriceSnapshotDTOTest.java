package com.pricehawl.service.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class PriceSnapshotDTOTest {

    @Test
    void shouldCreateSnapshotWithNoArgsConstructorAndSetters() {
        LocalDateTime crawledAt = LocalDateTime.of(2026, 6, 1, 16, 0);

        PriceSnapshotDTO dto = new PriceSnapshotDTO();

        dto.setPrice(99000);
        dto.setOriginalPrice(150000);
        dto.setDiscountPct(34.0);
        dto.setInStock(true);
        dto.setStatusText("Còn hàng");
        dto.setCrawledAt(crawledAt);
        dto.setSourceUrl("https://cocolux.com/product/1");

        assertEquals(99000, dto.getPrice());
        assertEquals(150000, dto.getOriginalPrice());
        assertEquals(34.0, dto.getDiscountPct());
        assertEquals(true, dto.getInStock());
        assertEquals("Còn hàng", dto.getStatusText());
        assertEquals(crawledAt, dto.getCrawledAt());
        assertEquals("https://cocolux.com/product/1", dto.getSourceUrl());
    }

    @Test
    void shouldCreateSnapshotWithAllArgsConstructor() {
        LocalDateTime crawledAt = LocalDateTime.of(2026, 6, 1, 16, 30);

        PriceSnapshotDTO dto = new PriceSnapshotDTO(
                120000,
                180000,
                33.33,
                false,
                "Hết hàng",
                crawledAt,
                "https://watsons.vn/product/2"
        );

        assertEquals(120000, dto.getPrice());
        assertEquals(180000, dto.getOriginalPrice());
        assertEquals(33.33, dto.getDiscountPct());
        assertEquals(false, dto.getInStock());
        assertEquals("Hết hàng", dto.getStatusText());
        assertEquals(crawledAt, dto.getCrawledAt());
        assertEquals("https://watsons.vn/product/2", dto.getSourceUrl());
    }

    @Test
    void shouldAllowNullValuesForOptionalFields() {
        PriceSnapshotDTO dto = new PriceSnapshotDTO();

        dto.setPrice(null);
        dto.setOriginalPrice(null);
        dto.setDiscountPct(null);
        dto.setInStock(null);
        dto.setStatusText(null);
        dto.setCrawledAt(null);
        dto.setSourceUrl(null);

        assertNull(dto.getPrice());
        assertNull(dto.getOriginalPrice());
        assertNull(dto.getDiscountPct());
        assertNull(dto.getInStock());
        assertNull(dto.getStatusText());
        assertNull(dto.getCrawledAt());
        assertNull(dto.getSourceUrl());
    }

    @Test
    void shouldIncludeImportantFieldsInToString() {
        LocalDateTime crawledAt = LocalDateTime.of(2026, 6, 1, 17, 0);

        PriceSnapshotDTO dto = new PriceSnapshotDTO(
                99000,
                150000,
                34.0,
                true,
                "Còn hàng",
                crawledAt,
                "https://example.com/product"
        );

        String result = dto.toString();

        assertTrue(result.contains("PriceSnapshotDTO"));
        assertTrue(result.contains("price=99000"));
        assertTrue(result.contains("originalPrice=150000"));
        assertTrue(result.contains("discountPct=34.0"));
        assertTrue(result.contains("inStock=true"));
        assertTrue(result.contains("Còn hàng"));
        assertTrue(result.contains("https://example.com/product"));
    }
}