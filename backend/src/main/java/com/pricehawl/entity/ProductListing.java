package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
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
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Map quan hệ 1-Nhiều tới bảng price_record (để lấy giá và label)
    @OneToMany(mappedBy = "productListing", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("updatedAt DESC") // Luôn lấy record mới nhất lên đầu
    private List<PriceRecord> priceRecords;

    //Hàm Helper để lấy promotion label cho ProductService gọi
    public String getPromotionLabel() {
        if (this.priceRecords != null && !this.priceRecords.isEmpty()) {
            return this.priceRecords.get(0).getPromotionLabel();
        }
        return null;
    }
}