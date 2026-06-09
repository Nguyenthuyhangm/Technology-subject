package com.pricehawl.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkinRoutineStepProductDTO {

    private String stepKey;
    private String stepLabel;
    private String routineTime;

    private UUID productId;
    private String productName;
    private String brandName;
    private String categoryName;
    private String imageUrl;
    private Integer lowestPrice;

    private String reason;
}