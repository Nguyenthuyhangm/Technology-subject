package com.pricehawl.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "wishlist")
// KHÔNG dùng bất kỳ Annotation nào của Lombok ở đây nữa
public class Wishlist {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "UUID", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "added_at", updatable = false)
    private LocalDateTime addedAt;

    // PHẢI CÓ Constructor mặc định
    public Wishlist() {}

    // Getter và Setter viết tay - Chạy được trên mọi phiên bản Java
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public LocalDateTime getAddedAt() { return addedAt; }
    public void setAddedAt(LocalDateTime addedAt) { this.addedAt = addedAt; }

    @PrePersist
    protected void onCreate() {
        this.addedAt = LocalDateTime.now();
    }
}
