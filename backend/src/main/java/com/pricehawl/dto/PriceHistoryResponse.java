package com.pricehawl.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceHistoryResponse {
    
    private UUID productId;
    private List<PlatformPriceData> platforms;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PlatformPriceData {
        private Integer platformId;
        private String platformName;
        private Integer latestPrice;
        private Double averagePrice30Days;
        private Boolean fakePriceIncreaseWarning;
        private List<PricePoint> prices;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PricePoint {
        private LocalDateTime crawledAt;
        private Integer price;
    }
}
