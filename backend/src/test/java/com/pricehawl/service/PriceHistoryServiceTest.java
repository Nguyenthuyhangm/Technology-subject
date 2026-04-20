package com.pricehawl.service;

import com.pricehawl.dto.PriceHistoryResponse;
import com.pricehawl.entity.Platform;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.PlatformRepository;
import com.pricehawl.repository.PriceRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@DisplayName("PriceHistoryService")
class PriceHistoryServiceTest {

    @Mock
    private PriceRecordRepository priceRecordRepository;

    @Mock
    private PlatformRepository platformRepository;

    @InjectMocks
    private PriceHistoryService priceHistoryService;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("Should flag fake price increase when latest price is above 30-day average")
    void shouldFlagFakePriceIncrease() {
        UUID productId = UUID.randomUUID();
        Platform cocolux = Platform.builder().id(1).name("Cocolux").build();
        Platform guardian = Platform.builder().id(2).name("Guardian").build();
        Platform hasaki = Platform.builder().id(3).name("Hasaki").build();

        ProductListing listing = ProductListing.builder()
            .platform(cocolux)
            .build();

        PriceRecord olderRecord = PriceRecord.builder()
            .productListing(listing)
            .price(100_000)
            .crawledAt(LocalDateTime.of(2026, 4, 1, 9, 0))
            .build();

        PriceRecord latestRecord = PriceRecord.builder()
            .productListing(listing)
            .price(180_000)
            .crawledAt(LocalDateTime.of(2026, 4, 10, 9, 0))
            .build();

        when(priceRecordRepository.findPriceHistoryLast30Days(eq(productId), any(LocalDateTime.class)))
            .thenReturn(List.of(olderRecord, latestRecord));
        when(platformRepository.findById(1)).thenReturn(Optional.of(cocolux));
        when(platformRepository.findById(2)).thenReturn(Optional.of(guardian));
        when(platformRepository.findById(3)).thenReturn(Optional.of(hasaki));

        PriceHistoryResponse response = priceHistoryService.getPriceHistory(productId);

        assertNotNull(response);
        assertEquals(3, response.getPlatforms().size());

        PriceHistoryResponse.PlatformPriceData cocoluxData = response.getPlatforms().get(0);
        assertEquals(180_000, cocoluxData.getLatestPrice());
        assertEquals(140_000.0, cocoluxData.getAveragePrice30Days());
        assertTrue(cocoluxData.getFakePriceIncreaseWarning());

        PriceHistoryResponse.PlatformPriceData guardianData = response.getPlatforms().get(1);
        assertNull(guardianData.getLatestPrice());
        assertNull(guardianData.getAveragePrice30Days());
        assertFalse(guardianData.getFakePriceIncreaseWarning());
    }
}
