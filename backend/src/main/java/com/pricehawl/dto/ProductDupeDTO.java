package com.pricehawl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDupeDTO {

    private UUID productId;
    private String name;
    private String imageUrl;
    private String brandName;
    private String categoryName;
    private Long lowestPrice;
    private Double score;
}