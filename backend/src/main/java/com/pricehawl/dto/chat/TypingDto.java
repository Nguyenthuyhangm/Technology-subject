package com.pricehawl.dto.chat;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class TypingDto {
    private Long conversationId;
    private UUID userId;
    private String displayName; // "Người dùng" or admin name
    private boolean typing;
    private boolean isAdmin;
}
