package com.pricehawl.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class PriceAlertRequest {
    private UUID productId;
    private Integer targetPrice;
    private Integer platformId;
    private String channel; // email | push | zalo
}