package com.pricehawl.dto;

import java.util.UUID;

public interface RecommendationProductDTO {

    UUID getId();

    String getName();

    String getImageUrl();

    String getSkinType();

    String getCategoryName();

    String getBrandName();

    Integer getScore();

    Integer getLowestPrice();

    String getPlatformName();

    String getProductUrl();
}