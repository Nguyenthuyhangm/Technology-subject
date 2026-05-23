package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "product_listing", indexes = {
        @Index(name = "idx_product_listing_product_id", columnList = "product_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductListing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "platform_id", nullable = false)
    private Platform platform;

    @Column(nullable = false, length = 500)
    private String platformName;

    @Column(nullable = false, length = 1000, unique = true)
    private String url;

    @Column(length = 500)
    private String platformImageUrl;

    /**
     * Điểm tin cậy listing (0.0–1.0).
     * Dùng cho Trending Deals & dedup.
     */
    @Column(name = "trust_score", nullable = false)
    @Builder.Default
    private Double trustScore = 0.50;

    /**
     * Listing được pin thủ công để ưu tiên hiển thị.
     */
    @Column(name = "is_pinned", nullable = false)
    @Builder.Default
    private Boolean isPinned = false;

    /**
     * Thời điểm crawl thành công gần nhất.
     */
    @Column(name = "crawl_time")
    private LocalDateTime crawlTime;

    /**
     * ===== SNAPSHOT CURRENT STATE =====
     * Các field này dùng cho:
     * - search
     * - compare page
     * - product card
     * - elasticsearch indexing
     *
     * KHÔNG cần query latest price_record nữa.
     */

    @Column(name = "current_price")
    private Integer currentPrice;

    @Column(name = "original_price")
    private Integer originalPrice;

    @Column(name = "discount_pct")
    private Double discountPct;

    @Column(name = "in_stock")
    private Boolean inStock;

    @Column(name = "promotion_label")
    private String promotionLabel;

    @Column(name = "is_flash_sale")
    private Boolean isFlashSale;

    /**
     * History records.
     *
     * Chỉ dùng cho:
     * - detail page
     * - chart
     * - analytics
     * - timeline/history
     *
     * KHÔNG dùng cho search page nữa.
     */
    @OneToMany(
            mappedBy = "productListing",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @OrderBy("crawledAt DESC")
    @Builder.Default
    private List<PriceRecord> priceRecords = new ArrayList<>();

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * ===== BACKWARD COMPATIBILITY HELPERS =====
     *
     * Giữ logic cũ để:
     * - service cũ không bị crash
     * - mapper cũ chưa cần sửa ngay
     * - FE cũ vẫn hoạt động tạm thời
     *
     * Nhưng giờ ưu tiên dùng snapshot fields:
     * - currentPrice
     * - originalPrice
     * - discountPct
     */

    @Transient
    public Integer getFinalPrice() {
        return currentPrice;
    }

    @Transient
    public Integer getComputedOriginalPrice() {
        return originalPrice;
    }

    @Transient
    public Integer getComputedDiscountPct() {
        if (discountPct == null) {
            return null;
        }

        return discountPct.intValue();
    }

    /**
     * Optional fallback helper.
     */
    @Transient
    public PriceRecord getLatestPriceRecord() {
        if (priceRecords == null || priceRecords.isEmpty()) {
            return null;
        }

        return priceRecords.get(0);
    }
}