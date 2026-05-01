package com.pricehawl.dto;

import com.pricehawl.entity.Product;

import java.util.UUID;

/**
 * DTO chỉ đọc cho API sản phẩm.
 */
public final class ProductModels {

    private ProductModels() {
    }

    public record ProductSummaryResponse(
            UUID id,
            String name,
            String imageUrl,
            String categoryName,
            String brandName,
            Integer popularityScore
    ) {
        public static ProductSummaryResponse from(Product p) {
            return new ProductSummaryResponse(
                    p.getId(),
                    p.getName(),
                    p.getImageUrl(),
                    p.getCategory() != null ? p.getCategory().getName() : null,
                    p.getBrand() != null ? p.getBrand().getName() : null,
                    p.getPopularityScore()
            );
        }
    }
}
