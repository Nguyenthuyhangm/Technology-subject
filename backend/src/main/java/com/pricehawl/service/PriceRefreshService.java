package com.pricehawl.service;

import com.pricehawl.service.model.PriceRefreshJobDTO;
import com.pricehawl.service.model.PriceRefreshResultDTO;

import java.util.List;

public interface PriceRefreshService {

    List<PriceRefreshResultDTO> runScheduledRefresh();

    List<PriceRefreshResultDTO> runWishlistRefresh();

    List<PriceRefreshResultDTO> runNormalRefresh();

    PriceRefreshResultDTO refreshOneListing(PriceRefreshJobDTO job);
}