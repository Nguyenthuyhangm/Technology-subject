package com.pricehawl.dto;

import java.util.UUID;

public interface AiRecommendationDTO {

    UUID getProductId();

    String getProductName();

    String getBrandName();

    String getCategoryName();

    Integer getLowestPrice();

    Integer getScore();

    String getReason();
}