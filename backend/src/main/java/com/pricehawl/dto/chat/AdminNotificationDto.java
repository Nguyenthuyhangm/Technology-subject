package com.pricehawl.dto.chat;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AdminNotificationDto {
    private String type;  // "NEW_MESSAGE" | "CONVERSATION_REOPENED"
    private Long conversationId;
    private UUID fromUserId;
    private String fromUserName;
    private String messagePreview;
    private LocalDateTime timestamp;
}
