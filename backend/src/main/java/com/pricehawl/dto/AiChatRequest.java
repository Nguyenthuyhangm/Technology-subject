package com.pricehawl.dto;

import java.util.List;
import java.util.UUID;

public record AiChatRequest(
        String message,
        UUID userId,
        UUID productId,
        List<AiChatHistoryMessage> conversationHistory
) {
}