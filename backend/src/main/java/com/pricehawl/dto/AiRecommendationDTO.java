package com.pricehawl.dto;

import java.util.UUID;

public interface AiRecommendationDTO {

    UUID getProductId();

    String getProductName();

    String getBrandName();

    String getCategoryName();

    String getImageUrl();
    
    Integer getLowestPrice();

    Integer getScore();

    String getReason();
}