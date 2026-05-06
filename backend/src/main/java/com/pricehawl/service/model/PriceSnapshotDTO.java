package com.pricehawl.service.model;
import java.time.LocalDateTime;

/**
 * DTO chứa snapshot giá mới vừa crawl được từ Cocolux.
 *
 * Đây là "đầu ra" của crawler service.
 *
 * Chỉ chứa các field cần cho auto refresh giá:
 * - giá hiện tại
 * - giá gốc
 * - discount
 * - còn hàng hay không
 * - trạng thái text
 * - thời điểm crawl
 * - URL nguồn
 */
public class PriceSnapshotDTO {

    private Integer price;
    private Integer originalPrice;
    private Double discountPct;
    private Boolean inStock;
    private String statusText;
    private LocalDateTime crawledAt;
    private String sourceUrl;

    public PriceSnapshotDTO() {
    }

    public PriceSnapshotDTO(
            Integer price,
            Integer originalPrice,
            Double discountPct,
            Boolean inStock,
            String statusText,
            LocalDateTime crawledAt,
            String sourceUrl
    ) {
        this.price = price;
        this.originalPrice = originalPrice;
        this.discountPct = discountPct;
        this.inStock = inStock;
        this.statusText = statusText;
        this.crawledAt = crawledAt;
        this.sourceUrl = sourceUrl;
    }

    public Integer getPrice() {
        return price;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }

    public Integer getOriginalPrice() {
        return originalPrice;
    }

    public void setOriginalPrice(Integer originalPrice) {
        this.originalPrice = originalPrice;
    }

    public Double getDiscountPct() {
        return discountPct;
    }

    public void setDiscountPct(Double discountPct) {
        this.discountPct = discountPct;
    }

    public Boolean getInStock() {
        return inStock;
    }

    public void setInStock(Boolean inStock) {
        this.inStock = inStock;
    }

    public String getStatusText() {
        return statusText;
    }

    public void setStatusText(String statusText) {
        this.statusText = statusText;
    }

    public LocalDateTime getCrawledAt() {
        return crawledAt;
    }

    public void setCrawledAt(LocalDateTime crawledAt) {
        this.crawledAt = crawledAt;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    @Override
    public String toString() {
        return "PriceSnapshotDTO{" +
                "price=" + price +
                ", originalPrice=" + originalPrice +
                ", discountPct=" + discountPct +
                ", inStock=" + inStock +
                ", statusText='" + statusText + '\'' +
                ", crawledAt=" + crawledAt +
                ", sourceUrl='" + sourceUrl + '\'' +
                '}';
    }
}