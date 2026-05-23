package com.pricehawl.controller;

import com.pricehawl.dto.NotificationResponse;
import com.pricehawl.entity.Notification;
import com.pricehawl.repository.NotificationRepository;
import com.pricehawl.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getAll(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID userId = UUID.fromString(principal.getUserId());
        List<NotificationResponse> list = notificationRepository
            .findByUserIdOrderByCreatedAtDesc(userId)
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID userId = UUID.fromString(principal.getUserId());
        long count = notificationRepository.countByUserIdAndIsReadFalse(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @Transactional
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID userId = UUID.fromString(principal.getUserId());
        notificationRepository.markAllReadByUserId(userId);
        return ResponseEntity.noContent().build();
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
            .id(n.getId())
            .productId(n.getProductId())
            .alertId(n.getAlertId())
            .title(n.getTitle())
            .message(n.getMessage())
            .isRead(n.isRead())
            .createdAt(n.getCreatedAt())
            .build();
    }
}