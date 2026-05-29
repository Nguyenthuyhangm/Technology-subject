package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "affiliate_clicks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AffiliateClick {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "platform", nullable = false)
    private String platform;

    @Column(name = "click_id", unique = true)
    private String clickId;

    @Column(name = "ip")
    private String ip;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "clicked_at", nullable = false, updatable = false)
    private LocalDateTime clickedAt;

    @PrePersist
    public void prePersist() {
        this.clickedAt = LocalDateTime.now();
    }
}