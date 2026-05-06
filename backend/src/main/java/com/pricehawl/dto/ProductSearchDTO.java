package com.pricehawl.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductSearchDTO {

    private UUID id;
    private String name;

    private String brandName;
    private String categoryName;

    private String imageUrl;


    private Integer bestPrice;
    private Integer originalPrice;
    private Integer discountPct;
    private String bestPlatform;
    private Double score;
}