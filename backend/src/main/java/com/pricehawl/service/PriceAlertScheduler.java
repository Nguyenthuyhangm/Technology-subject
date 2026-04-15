package com.pricehawl.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PriceAlertScheduler {

    private final PriceAlertService priceAlertService;

    // Mỗi 5 phút quét alert đang active
    @Scheduled(fixedRate = 300000)
    public void checkAlerts() {
        log.info("Running scheduled price alert check...");
        priceAlertService.checkAllActiveAlerts();
    }
}