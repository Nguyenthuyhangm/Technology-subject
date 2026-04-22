package com.pricehawl.service;

import com.pricehawl.dto.PriceHistoryResponse;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.repository.PlatformRepository;
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
    private final PlatformRepository platformRepository;
    
    public PriceHistoryResponse getPriceHistory(UUID productId) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        
        List<PriceRecord> priceRecords = priceRecordRepository
            .findPriceHistoryLast30Days(productId, thirtyDaysAgo);
        
        // Nhóm theo platform_id (lấy từ ProductListing)
        Map<Integer, List<PriceRecord>> groupedByPlatform = priceRecords.stream()
            .collect(Collectors.groupingBy(pr -> pr.getProductListing().getPlatform().getId()));
        
        // Tạo response cho từng platform (bao gồm cả platform không có giá)
        List<PriceHistoryResponse.PlatformPriceData> platformData = List.of(1, 2, 3).stream()
            .map(platformId -> {
                String platformName = platformRepository.findById(platformId)
                    .map(p -> p.getName())
                    .orElse("Unknown");

                List<PriceRecord> platformRecords = groupedByPlatform.getOrDefault(platformId, List.of());

                List<PriceHistoryResponse.PricePoint> pricePoints =
                    platformRecords.stream()
                        .map(pr -> PriceHistoryResponse.PricePoint.builder()
                            .crawledAt(pr.getCrawledAt())
                            .price(pr.getPrice())
                            .build())
                        .collect(Collectors.toList());

                Integer latestPrice = platformRecords.stream()
                    .max(Comparator.comparing(PriceRecord::getCrawledAt))
                    .map(PriceRecord::getPrice)
                    .orElse(null);

                Double averagePrice30Days = platformRecords.isEmpty()
                    ? null
                    : platformRecords.stream()
                        .collect(Collectors.averagingInt(PriceRecord::getPrice));

                Boolean fakePriceIncreaseWarning = latestPrice != null
                    && averagePrice30Days != null
                    && latestPrice > averagePrice30Days;

                return PriceHistoryResponse.PlatformPriceData.builder()
                    .platformId(platformId)
                    .platformName(platformName)
                    .latestPrice(latestPrice)
                    .averagePrice30Days(averagePrice30Days)
                    .fakePriceIncreaseWarning(fakePriceIncreaseWarning)
                    .prices(pricePoints)
                    .build();
            })
            .collect(Collectors.toList());
        
        return PriceHistoryResponse.builder()
            .productId(productId)
            .platforms(platformData)
            .build();
    }
}
