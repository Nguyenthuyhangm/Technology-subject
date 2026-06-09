package com.pricehawl.dto;

import java.util.UUID;

public record VideoWithProductDTO(
    UUID videoId,
    UUID productId,
    String productName,
    String productImageUrl,
    Long bestPrice,
    String bestPlatform,
    String videoUrl,
    String thumbnailUrl,
    String youtubeId
) {}
