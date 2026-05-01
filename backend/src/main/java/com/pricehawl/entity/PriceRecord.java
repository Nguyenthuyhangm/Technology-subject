package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "price_record", indexes = {
        @Index(name = "idx_price_record_listing_crawled", columnList = "product_listing_id, crawled_at DESC"),
        @Index(name = "idx_price_record_crawled", columnList = "crawled_at DESC")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_listing_id", nullable = false)
    private ProductListing productListing;

    @Column(nullable = false)
    private Integer price;

    @Column
    private Integer originalPrice;

    @Column
    private Float discountPct;

    @Column(nullable = false)
    @Builder.Default
    private Boolean inStock = true;

    @Column(length = 255)
    private String promotionLabel;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isFlashSale = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime crawledAt;
}
