package com.pricehawl.dto;

import java.math.BigDecimal;
import java.util.UUID;

public interface AiProductContextDTO {

    UUID getProductId();

    String getProductName();

    String getBrandName();

    String getCategoryName();

    String getImageUrl();

    String getSkinType();

    Integer getCurrentPrice();

    Integer getLowestPrice();

    BigDecimal getAvg30dPrice();

    BigDecimal getPriceChangePercent();

    Boolean getInStock();

    String getPlatformName();

    String getProductUrl();
}