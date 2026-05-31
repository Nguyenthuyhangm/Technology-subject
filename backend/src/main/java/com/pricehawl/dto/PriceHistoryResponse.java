package com.pricehawl.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceHistoryResponse implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private UUID productId;
    private List<PlatformPriceData> platforms;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PlatformPriceData implements Serializable {
        private static final long serialVersionUID = 1L;
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
    public static class PricePoint implements Serializable {
        private static final long serialVersionUID = 1L;

        // Thêm format này để Jackson lưu trữ được thời gian vào Redis
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime crawledAt;
        private Integer price;
    }
}