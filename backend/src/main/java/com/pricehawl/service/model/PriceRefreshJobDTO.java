package com.pricehawl.service.model;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO đại diện cho 1 "job" cần auto refresh giá.
 *
 * Dùng ở service để truyền dữ liệu từ repository -> crawler service.
 *
 * Ví dụ:
 * - productListingId nào cần crawl
 * - productId nào
 * - URL nào
 * - thuộc platform nào
 * - có phải job ưu tiên wishlist không
 * - lần crawl gần nhất là khi nào
 */
public class PriceRefreshJobDTO {

    private UUID productListingId;
    private UUID productId;
    private String url;
    private String platformName;
    private boolean wishlistPriority;
    private LocalDateTime lastCrawlTime;

    public PriceRefreshJobDTO() {
    }

    public PriceRefreshJobDTO(
            UUID productListingId,
            UUID productId,
            String url,
            String platformName,
            boolean wishlistPriority,
            LocalDateTime lastCrawlTime
    ) {
        this.productListingId = productListingId;
        this.productId = productId;
        this.url = url;
        this.platformName = platformName;
        this.wishlistPriority = wishlistPriority;
        this.lastCrawlTime = lastCrawlTime;
    }

    public UUID getProductListingId() {
        return productListingId;
    }

    public void setProductListingId(UUID productListingId) {
        this.productListingId = productListingId;
    }

    public UUID getProductId() {
        return productId;
    }

    public void setProductId(UUID productId) {
        this.productId = productId;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getPlatformName() {
        return platformName;
    }

    public void setPlatformName(String platformName) {
        this.platformName = platformName;
    }

    public boolean isWishlistPriority() {
        return wishlistPriority;
    }

    public void setWishlistPriority(boolean wishlistPriority) {
        this.wishlistPriority = wishlistPriority;
    }

    public LocalDateTime getLastCrawlTime() {
        return lastCrawlTime;
    }

    public void setLastCrawlTime(LocalDateTime lastCrawlTime) {
        this.lastCrawlTime = lastCrawlTime;
    }

    @Override
    public String toString() {
        return "PriceRefreshJobDTO{" +
                "productListingId=" + productListingId +
                ", productId=" + productId +
                ", url='" + url + '\'' +
                ", platformName='" + platformName + '\'' +
                ", wishlistPriority=" + wishlistPriority +
                ", lastCrawlTime=" + lastCrawlTime +
                '}';
    }
}