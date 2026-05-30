package com.pricehawl.dto;

public record AiChatHistoryMessage(
        String role,
        String content
) {
}