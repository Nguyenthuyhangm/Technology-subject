package com.pricehawl.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class PriceAlertResponse {
    private UUID id;
    private UUID productId;
    private String productName;
    private String productImageUrl;
    private Integer targetPrice;
    private Integer platformId;
    private String platformName;
    private String channel;
    private boolean isActive;
    private LocalDateTime notifiedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}