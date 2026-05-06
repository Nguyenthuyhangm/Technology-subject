package com.pricehawl.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class PriceAlertRequest {
    private UUID userId;
    private UUID productId;
    private Integer platformId;   // null = alert mọi sàn
    private Integer targetPrice;
}