package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "price_alert")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PriceAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "platform_id")
    private Integer platformId;

    @Column(name = "target_price", nullable = false)
    private Integer targetPrice;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "channel", nullable = false)
    private String channel = "email";

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}