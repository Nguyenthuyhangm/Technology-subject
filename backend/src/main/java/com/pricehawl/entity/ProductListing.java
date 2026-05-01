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
@Data
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
     * Điểm tin cậy listing (0.0–1.0). Dùng cho Trending Deals & dedup.
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
     * Thời điểm lần cuối auto-crawl giá thành công.
     * Map với cột crawl_time trong DB.
     */
    @Column(name = "crawl_time")
    private LocalDateTime crawlTime;

    // Map quan hệ 1-Nhiều tới bảng price_record
    @OneToMany(mappedBy = "productListing", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("updatedAt DESC") // Luôn lấy record mới nhất lên đầu
    @Builder.Default
    private List<PriceRecord> priceRecords = new ArrayList<>();

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Helper để lấy promotion label cho ProductService gọi
    public String getPromotionLabel() {
        if (this.priceRecords != null && !this.priceRecords.isEmpty()) {
            return this.priceRecords.get(0).getPromotionLabel();
        }
        return null;
    }
}