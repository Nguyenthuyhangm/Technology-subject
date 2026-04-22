package com.pricehawl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceAlertResponse {

    private UUID id;

    private UUID userId;

    private UUID productId;
    private String productName;
    private String imageUrl;

    private Integer platformId;
    private String platformName;

    private Integer targetPrice;
    private Integer currentPrice;

    private Boolean isActive;
    private LocalDateTime notifiedAt;
    private LocalDateTime createdAt;
}