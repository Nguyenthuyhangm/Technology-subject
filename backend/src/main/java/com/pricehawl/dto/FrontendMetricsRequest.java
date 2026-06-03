package com.pricehawl.dto;

public record FrontendMetricsRequest(
    Double pageLoadSeconds,
    int apiRequests,
    int apiErrors,
    int jsErrors,
    String page
) {}
