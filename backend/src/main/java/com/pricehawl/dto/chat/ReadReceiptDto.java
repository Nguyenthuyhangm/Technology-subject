package com.pricehawl.dto.chat;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ReadReceiptDto {
    private Long conversationId;
    private Long messageId;
    private UUID readerId;
    private List<UUID> readByIds;
}
