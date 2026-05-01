package com.pricehawl.dto;

import com.pricehawl.entity.ProductListing;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO / record liên quan trending deals (gom một file).
 */
public final class TrendingDealModels {

    private TrendingDealModels() {
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendingDealResponse {
        private UUID listingId;
        private UUID productId;
        private String productName;
        private String imageUrl;
        private String platformName;
        private Integer currentPrice;
        private Integer originalPrice;
        private Float discountPercent;
        private Boolean isFlashSale;
        private Double dealScore;
        private String badge;
        private String explanation;
        private boolean isPinned;
        private Boolean priceConflict;
        private String priceConflictMessage;
        private Double discountScore;
        private Double trustScore;
        private Double freshnessScore;
    }

    public record TrendingDealsSnapshot(
            List<TrendingDealResponse> deals,
            Instant computedAt,
            long cacheTtlSeconds
    ) {
    }

    public record DealScoreCalculation(
            double discountScore,
            double trustScore,
            double freshnessScore,
            double totalDealScore
    ) {
        public static DealScoreCalculation zero() {
            return new DealScoreCalculation(0, 0, 0, 0);
        }
    }

    public record TrendingDealDTO(
            ProductListing listing,
            DealScoreCalculation score,
            com.pricehawl.entity.PriceRecord latestPriceRecord,
            List<com.pricehawl.entity.PriceRecord> priceRecordsDesc
    ) {
    }
}
