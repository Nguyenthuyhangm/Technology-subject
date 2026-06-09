package com.pricehawl.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ProductVideoDTO(
    UUID id,
    String title,
    String videoUrl,
    String thumbnailUrl,
    String publicId,
    String youtubeId,
    Integer duration,
    LocalDateTime createdAt,
    UUID createdBy,
    List<UUID> productIds,
    List<String> productNames,
    Integer productCount,
    String status
) {}
