package com.pricehawl.dto.chat;

import lombok.Data;

@Data
public class ChatMessageRequest {
    private Long conversationId;
    private String content;
}
