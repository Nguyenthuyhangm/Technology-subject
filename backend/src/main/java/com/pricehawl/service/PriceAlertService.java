package com.pricehawl.service;

import com.pricehawl.dto.CreatePriceAlertRequest;
import com.pricehawl.dto.PriceAlertResponse;

import java.util.List;
import java.util.UUID;

public interface PriceAlertService {

    PriceAlertResponse createAlert(CreatePriceAlertRequest request);

    List<PriceAlertResponse> getAlertsByUser(UUID userId);

    PriceAlertResponse toggleAlert(UUID alertId);

    void deleteAlert(UUID alertId);

    void checkAlertsForProduct(UUID productId);

    void checkAllActiveAlerts();
}