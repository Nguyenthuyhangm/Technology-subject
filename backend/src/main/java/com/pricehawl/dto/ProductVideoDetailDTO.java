package com.pricehawl.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProductVideoDetailDTO(
    UUID videoId,
    String title,
    String videoUrl,
    String thumbnailUrl,
    String youtubeId,
    Integer duration,
    LocalDateTime createdAt,
    String productName
) {}
