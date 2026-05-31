package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "crawl_errors")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CrawlError {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String platform;

    @Column(name = "product_listing_id")
    private UUID productListingId;

    @Column(name = "product_name")
    private String productName;

    @Column(length = 1000)
    private String url;

    @Column(name = "error_type")
    private String errorType; // NOT_FOUND, TIMEOUT, BLOCKED, CAPTCHA, OTHER

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "crawled_at")
    @Builder.Default
    private LocalDateTime crawledAt = LocalDateTime.now();
}