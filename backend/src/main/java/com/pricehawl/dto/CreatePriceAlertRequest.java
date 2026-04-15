package com.pricehawl.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePriceAlertRequest {

    private UUID userId;
    private UUID productId;
    private Integer platformId; // nullable: null = all platforms
    private Integer targetPrice;
}