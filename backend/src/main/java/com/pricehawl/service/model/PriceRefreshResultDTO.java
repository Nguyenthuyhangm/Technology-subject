package com.pricehawl.service.model;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO dùng để log/debug kết quả xử lý của từng job refresh giá.
 *
 * Nó giúp bạn biết:
 * - listing nào đã được xử lý
 * - crawl thành công hay thất bại
 * - có insert price_record mới không
 * - lý do skip là gì
 * - giá cũ / giá mới ra sao
 *
 * DTO này rất hữu ích để:
 * - ghi log
 * - ghi file debug JSON
 * - trả API admin nếu cần chạy tay
 */
public class PriceRefreshResultDTO {

    private UUID productListingId;
    private UUID productId;
    private String url;
    private String platformName;
    private boolean wishlistPriority;

    private boolean crawlSuccess;
    private boolean insertedNewPriceRecord;
    private String action; // INSERTED / SKIPPED / FAILED
    private String reason;

    private Integer oldPrice;
    private Integer oldOriginalPrice;
    private Boolean oldInStock;

    private Integer newPrice;
    private Integer newOriginalPrice;
    private Boolean newInStock;

    private LocalDateTime processedAt;
    private String errorMessage;

    public PriceRefreshResultDTO() {
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

    public boolean isCrawlSuccess() {
        return crawlSuccess;
    }

    public void setCrawlSuccess(boolean crawlSuccess) {
        this.crawlSuccess = crawlSuccess;
    }

    public boolean isInsertedNewPriceRecord() {
        return insertedNewPriceRecord;
    }

    public void setInsertedNewPriceRecord(boolean insertedNewPriceRecord) {
        this.insertedNewPriceRecord = insertedNewPriceRecord;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Integer getOldPrice() {
        return oldPrice;
    }

    public void setOldPrice(Integer oldPrice) {
        this.oldPrice = oldPrice;
    }

    public Integer getOldOriginalPrice() {
        return oldOriginalPrice;
    }

    public void setOldOriginalPrice(Integer oldOriginalPrice) {
        this.oldOriginalPrice = oldOriginalPrice;
    }

    public Boolean getOldInStock() {
        return oldInStock;
    }

    public void setOldInStock(Boolean oldInStock) {
        this.oldInStock = oldInStock;
    }

    public Integer getNewPrice() {
        return newPrice;
    }

    public void setNewPrice(Integer newPrice) {
        this.newPrice = newPrice;
    }

    public Integer getNewOriginalPrice() {
        return newOriginalPrice;
    }

    public void setNewOriginalPrice(Integer newOriginalPrice) {
        this.newOriginalPrice = newOriginalPrice;
    }

    public Boolean getNewInStock() {
        return newInStock;
    }

    public void setNewInStock(Boolean newInStock) {
        this.newInStock = newInStock;
    }

    public LocalDateTime getProcessedAt() {
        return processedAt;
    }

    public void setProcessedAt(LocalDateTime processedAt) {
        this.processedAt = processedAt;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    @Override
    public String toString() {
        return "PriceRefreshResultDTO{" +
                "productListingId=" + productListingId +
                ", productId=" + productId +
                ", url='" + url + '\'' +
                ", platformName='" + platformName + '\'' +
                ", wishlistPriority=" + wishlistPriority +
                ", crawlSuccess=" + crawlSuccess +
                ", insertedNewPriceRecord=" + insertedNewPriceRecord +
                ", action='" + action + '\'' +
                ", reason='" + reason + '\'' +
                ", oldPrice=" + oldPrice +
                ", oldOriginalPrice=" + oldOriginalPrice +
                ", oldInStock=" + oldInStock +
                ", newPrice=" + newPrice +
                ", newOriginalPrice=" + newOriginalPrice +
                ", newInStock=" + newInStock +
                ", processedAt=" + processedAt +
                ", errorMessage='" + errorMessage + '\'' +
                '}';
    }
}