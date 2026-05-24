package com.pricehawl.dto;

import java.util.UUID;

public record AiChatRequest(
        String message,
        UUID userId,
        UUID productId
) {
}