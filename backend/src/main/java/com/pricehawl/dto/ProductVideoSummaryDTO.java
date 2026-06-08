package com.pricehawl.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProductVideoSummaryDTO(
    UUID productId,
    String productName,
    Integer videoCount,
    LocalDateTime latestCrawlDate
) {}
