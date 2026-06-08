package com.pricehawl.dto.chat;

import com.pricehawl.entity.ConversationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ConversationDto {
    private Long id;
    private UUID userId;
    private String userName;
    private String userEmail;
    private UUID primaryAdminId;
    private String primaryAdminName;
    private ConversationStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String lastMessagePreview;
    private long unreadCount;
}
