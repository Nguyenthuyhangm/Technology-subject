package com.pricehawl.service;

import com.pricehawl.dto.PriceHistoryResponse;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.repository.PriceRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PriceHistoryService {

    private final PriceRecordRepository priceRecordRepository;
    

    public PriceHistoryResponse getPriceHistory(UUID productId) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        // 1. Fetch dữ liệu một lần duy nhất (Repository đã có JOIN FETCH platform)
        List<PriceRecord> priceRecords = priceRecordRepository
            .findPriceHistoryLast30Days(productId, thirtyDaysAgo);

        if (priceRecords.isEmpty()) {
            return PriceHistoryResponse.builder()
                .productId(productId)
                .platforms(List.of())
                .build();
        }

        // 2. Nhóm theo Platform ID
        Map<Integer, List<PriceRecord>> groupedByPlatform = priceRecords.stream()
            .collect(Collectors.groupingBy(pr -> pr.getProductListing().getPlatform().getId()));

        // 3. Map sang DTO mà KHÔNG gọi thêm Repository
        List<PriceHistoryResponse.PlatformPriceData> platformData = groupedByPlatform.entrySet().stream()
            .map(entry -> {
                Integer platformId = entry.getKey();
                List<PriceRecord> platformRecords = entry.getValue();
                
                // Lấy thông tin Platform trực tiếp từ Record đầu tiên (đã được JOIN FETCH)
                var firstRecord = platformRecords.get(0);
                String platformName = firstRecord.getProductListing().getPlatform().getName();

                // Chuyển đổi danh sách các điểm giá
                List<PriceHistoryResponse.PricePoint> pricePoints = platformRecords.stream()
                    .map(pr -> PriceHistoryResponse.PricePoint.builder()
                        .crawledAt(pr.getCrawledAt())
                        .price(pr.getPrice())
                        .build())
                    .collect(Collectors.toList());

                // Tìm giá mới nhất
                Integer latestPrice = platformRecords.get(platformRecords.size() - 1).getPrice();

                // Tính toán trung bình cộng 30 ngày
                double averagePrice30Days = platformRecords.stream()
                        .mapToInt(PriceRecord::getPrice)
                        .average()
                        .orElse(0.0);

                // Cảnh báo tăng giá ảo (Latest > Average)
                boolean fakePriceIncreaseWarning = latestPrice > averagePrice30Days && averagePrice30Days > 0;

                return PriceHistoryResponse.PlatformPriceData.builder()
                    .platformId(platformId)
                    .platformName(platformName)
                    .latestPrice(latestPrice)
                    .averagePrice30Days(averagePrice30Days)
                    .fakePriceIncreaseWarning(fakePriceIncreaseWarning)
                    .prices(pricePoints)
                    .build();
            })
            .sorted(Comparator.comparing(PriceHistoryResponse.PlatformPriceData::getPlatformId))
            .collect(Collectors.toList());

        return PriceHistoryResponse.builder()
            .productId(productId)
            .platforms(platformData)
            .build();
    }
}