package com.pricehawl.service;

import com.pricehawl.dto.PriceHistoryResponse;
import com.pricehawl.entity.Platform;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.PlatformRepository;
import com.pricehawl.repository.PriceRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PriceHistoryServiceTest {

    @Mock private PriceRecordRepository priceRecordRepository;
    @Mock private PlatformRepository platformRepository;

    @InjectMocks
    private PriceHistoryService service;

    private UUID productId;
    private Platform platform;

    @BeforeEach
    void setUp() {
        productId = UUID.randomUUID();
        platform = Platform.builder().id(1).name("Tiki").isActive(true).build();
    }

    private PriceRecord rec(int price, int platformId, LocalDateTime crawledAt) {
        Platform p = Platform.builder().id(platformId).name("Platform" + platformId).build();
        ProductListing listing = ProductListing.builder()
                .id(UUID.randomUUID())
                .platform(p)
                .platformName("Platform" + platformId)
                .url("https://example.com")
                .status("active")
                .build();
        return PriceRecord.builder()
                .price(price)
                .originalPrice(price + 20_000)
                .inStock(true)
                .crawledAt(crawledAt)
                .productListing(listing)
                .build();
    }

    // ── no records → empty platforms ──────────────────────────────────────────

    @Test
    void getPriceHistory_noRecords_returnsEmptyPlatforms() {
        when(priceRecordRepository.findPriceHistoryLast30Days(eq(productId), any()))
                .thenReturn(List.of());

        PriceHistoryResponse response = service.getPriceHistory(productId);
        assertEquals(productId, response.getProductId());
        assertTrue(response.getPlatforms().isEmpty());
    }

    // ── records từ 1 platform → 1 PlatformPriceData ──────────────────────────

    @Test
    void getPriceHistory_singlePlatform_returnsOnePlatformData() {
        LocalDateTime now = LocalDateTime.now();
        List<PriceRecord> records = List.of(
                rec(100_000, 1, now.minusDays(2)),
                rec(90_000, 1, now.minusDays(1)),
                rec(80_000, 1, now)
        );
        when(priceRecordRepository.findPriceHistoryLast30Days(eq(productId), any()))
                .thenReturn(records);
        when(platformRepository.findById(1)).thenReturn(Optional.of(platform));

        PriceHistoryResponse response = service.getPriceHistory(productId);
        assertEquals(1, response.getPlatforms().size());

        PriceHistoryResponse.PlatformPriceData data = response.getPlatforms().get(0);
        assertEquals(1, data.getPlatformId());
        assertEquals(3, data.getPrices().size());
        assertEquals(80_000, data.getLatestPrice()); // max crawledAt
    }

    // ── averagePrice30Days tính đúng ──────────────────────────────────────────

    @Test
    void getPriceHistory_averagePriceCalculatedCorrectly() {
        LocalDateTime now = LocalDateTime.now();
        List<PriceRecord> records = List.of(
                rec(100_000, 1, now.minusDays(2)),
                rec(200_000, 1, now.minusDays(1))
        );
        when(priceRecordRepository.findPriceHistoryLast30Days(eq(productId), any()))
                .thenReturn(records);
        when(platformRepository.findById(1)).thenReturn(Optional.of(platform));

        PriceHistoryResponse response = service.getPriceHistory(productId);
        PriceHistoryResponse.PlatformPriceData data = response.getPlatforms().get(0);
        assertEquals(150_000.0, data.getAveragePrice30Days());
    }

    // ── fakePriceIncreaseWarning: latestPrice > average → true ───────────────

    @Test
    void getPriceHistory_latestPriceAboveAverage_warningTrue() {
        LocalDateTime now = LocalDateTime.now();
        // average = (50_000 + 50_000 + 200_000) / 3 = 100_000; latest = 200_000 > 100_000
        List<PriceRecord> records = List.of(
                rec(50_000, 1, now.minusDays(2)),
                rec(50_000, 1, now.minusDays(1)),
                rec(200_000, 1, now)
        );
        when(priceRecordRepository.findPriceHistoryLast30Days(eq(productId), any()))
                .thenReturn(records);
        when(platformRepository.findById(1)).thenReturn(Optional.of(platform));

        PriceHistoryResponse response = service.getPriceHistory(productId);
        PriceHistoryResponse.PlatformPriceData data = response.getPlatforms().get(0);
        assertTrue(data.getFakePriceIncreaseWarning());
    }

    // ── fakePriceIncreaseWarning: latestPrice <= average → false ─────────────

    @Test
    void getPriceHistory_latestPriceBelowAverage_warningFalse() {
        LocalDateTime now = LocalDateTime.now();
        // average = (200_000 + 200_000 + 50_000) / 3 ≈ 150_000; latest = 50_000 < 150_000
        List<PriceRecord> records = List.of(
                rec(200_000, 1, now.minusDays(2)),
                rec(200_000, 1, now.minusDays(1)),
                rec(50_000, 1, now)
        );
        when(priceRecordRepository.findPriceHistoryLast30Days(eq(productId), any()))
                .thenReturn(records);
        when(platformRepository.findById(1)).thenReturn(Optional.of(platform));

        PriceHistoryResponse response = service.getPriceHistory(productId);
        PriceHistoryResponse.PlatformPriceData data = response.getPlatforms().get(0);
        assertFalse(data.getFakePriceIncreaseWarning());
    }

    // ── records từ 2 platform → 2 PlatformPriceData, sort by platformId ──────

    @Test
    void getPriceHistory_twoPlatforms_returnsTwoPlatformDataSorted() {
        LocalDateTime now = LocalDateTime.now();
        Platform p2 = Platform.builder().id(2).name("Shopee").build();
        List<PriceRecord> records = List.of(
                rec(100_000, 2, now.minusDays(1)),
                rec(90_000, 1, now)
        );
        when(priceRecordRepository.findPriceHistoryLast30Days(eq(productId), any()))
                .thenReturn(records);
        when(platformRepository.findById(1)).thenReturn(Optional.of(platform));
        when(platformRepository.findById(2)).thenReturn(Optional.of(p2));

        PriceHistoryResponse response = service.getPriceHistory(productId);
        assertEquals(2, response.getPlatforms().size());
        // sorted by platformId ascending
        assertEquals(1, response.getPlatforms().get(0).getPlatformId());
        assertEquals(2, response.getPlatforms().get(1).getPlatformId());
    }
}
