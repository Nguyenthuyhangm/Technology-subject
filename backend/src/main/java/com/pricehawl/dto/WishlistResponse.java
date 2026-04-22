package com.pricehawl.dto;

import java.util.UUID;
import java.time.LocalDateTime;

public interface WishlistResponse {
    UUID getWishlistId();
    UUID getProductId();
    String getProductName();
    String getBrandName();
    String getImageUrl();
    Integer getMinPrice();
    String getPlatformName();
    LocalDateTime getAddedAt();
}