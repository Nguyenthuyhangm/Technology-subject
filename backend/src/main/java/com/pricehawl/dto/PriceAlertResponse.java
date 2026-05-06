package com.pricehawl.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class PriceAlertResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private String userEmail;

    private UUID productId;
    private String productName;

    private Integer platformId;
    private String platformName;

    private Integer targetPrice;
    private Boolean isActive;
    private LocalDateTime notifiedAt;
    private LocalDateTime createdAt;
}