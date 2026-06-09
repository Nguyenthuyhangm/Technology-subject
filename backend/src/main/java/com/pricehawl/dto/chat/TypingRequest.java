package com.pricehawl.dto.chat;

import lombok.Data;

@Data
public class TypingRequest {
    private Long conversationId;
    private boolean typing;
}
