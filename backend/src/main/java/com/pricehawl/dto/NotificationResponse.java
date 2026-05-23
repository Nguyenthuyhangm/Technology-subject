package com.pricehawl.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class NotificationResponse {
    private UUID id;
    private UUID productId;
    private UUID alertId;
    private String title;
    private String message;
    private boolean isRead;
    private LocalDateTime createdAt;
}