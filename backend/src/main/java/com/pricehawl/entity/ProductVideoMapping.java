package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "product_video_mapping",
       uniqueConstraints = @UniqueConstraint(columnNames = {"video_id", "product_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ProductVideoMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private ProductVideo video;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    public ProductVideoMapping(ProductVideo video, UUID productId) {
        this.video = video;
        this.productId = productId;
    }
}
