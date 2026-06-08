package com.pricehawl.document;

import lombok.*;

import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "products")
public class ProductDocument {

    @Id
    private String id;

    private String name;

    private String categoryName;

    private String brandName;

    private String description;

    private String imageUrl;

    private Integer bestPrice;

    private Integer originalPrice;

    private Integer discountPct;

    private String bestPlatform;

    private Boolean inStock;

    private Boolean isFlashSale;

    private String promotionLabel;

    private String nameNormalize;

    private Double score;
}