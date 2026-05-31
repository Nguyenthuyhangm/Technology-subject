package com.pricehawl.service;

import com.pricehawl.dto.PriceHistoryResponse;
import com.pricehawl.entity.Platform;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.PriceRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PriceHistoryServiceTest {

    @Mock
    private PriceRecordRepository priceRecordRepository;

    @InjectMocks
    private PriceHistoryService service;

    private UUID productId;

    @BeforeEach
    void setUp() {
        productId = UUID.randomUUID();
    }

    // Hàm helper tạo PriceRecord giả lập
    private PriceRecord createRecord(Integer platformId, String platformName, int price, LocalDateTime time) {
        Platform platform = Platform.builder()
                .id(platformId)
                .name(platformName)
                .build();

        ProductListing listing = ProductListing.builder()
                .platform(platform)
                .build();

        return PriceRecord.builder()
                .price(price)
                .crawledAt(time)
                .productListing(listing)
                .build();
    }

    @Test
    @DisplayName("Nên trả về list rỗng nếu không có dữ liệu giá")
    void getPriceHistory_Empty() {
        when(priceRecordRepository.findPriceHistoryLast30Days(eq(productId), any()))
                .thenReturn(List.of());

        PriceHistoryResponse response = service.getPriceHistory(productId);

        assertNotNull(response);
        assertTrue(response.getPlatforms().isEmpty());
    }

    @Test
    @DisplayName("Nên nhóm giá theo Platform và tính toán trung bình chính xác")
    void getPriceHistory_Success() {
        LocalDateTime now = LocalDateTime.now();
        // Giả lập 2 record cho Platform 1 (Tiki)
        PriceRecord r1 = createRecord(1, "Tiki", 100000, now.minusDays(1));
        PriceRecord r2 = createRecord(1, "Tiki", 200000, now); // Đây là latestPrice

        when(priceRecordRepository.findPriceHistoryLast30Days(eq(productId), any()))
                .thenReturn(List.of(r1, r2));

        PriceHistoryResponse response = service.getPriceHistory(productId);

        assertEquals(1, response.getPlatforms().size());
        PriceHistoryResponse.PlatformPriceData data = response.getPlatforms().get(0);

        assertEquals("Tiki", data.getPlatformName());
        assertEquals(200000, data.getLatestPrice());
        // Trung bình (100k + 200k) / 2 = 150k
        assertEquals(150000.0, data.getAveragePrice30Days());
        // Vì latest (200k) > average (150k) nên warning phải là TRUE
        assertTrue(data.getFakePriceIncreaseWarning());
    }

    @Test
    @DisplayName("Cảnh báo tăng giá ảo nên là FALSE nếu giá giảm")
    void getPriceHistory_NoWarningOnPriceDrop() {
        LocalDateTime now = LocalDateTime.now();
        PriceRecord r1 = createRecord(1, "Tiki", 200000, now.minusDays(1));
        PriceRecord r2 = createRecord(1, "Tiki", 50000, now); // Giá giảm mạnh

        when(priceRecordRepository.findPriceHistoryLast30Days(eq(productId), any()))
                .thenReturn(List.of(r1, r2));

        PriceHistoryResponse response = service.getPriceHistory(productId);
        PriceHistoryResponse.PlatformPriceData data = response.getPlatforms().get(0);

        // Trung bình 125k, latest 50k -> Warning False
        assertFalse(data.getFakePriceIncreaseWarning());
    }
}