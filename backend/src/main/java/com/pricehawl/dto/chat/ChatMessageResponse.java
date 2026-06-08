package com.pricehawl.dto.chat;

import com.pricehawl.entity.SenderType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ChatMessageResponse {
    private Long id;
    private Long conversationId;
    private UUID senderId;
    private SenderType senderType;
    private String senderName;   // "Hỗ trợ viên" for ADMIN when shown to user
    private String content;
    private LocalDateTime createdAt;
    private List<UUID> readByIds;
}
