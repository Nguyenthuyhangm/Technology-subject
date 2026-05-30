package com.pricehawl.service;

import com.pricehawl.entity.Notification;
import com.pricehawl.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /** Lưu notification trong transaction riêng — không ảnh hưởng transaction gọi */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void savePaymentNotification(UUID userId, String title, String message) {
        try {
            notificationRepository.save(Notification.builder()
                    .userId(userId)
                    .title(title)
                    .message(message)
                    .isRead(false)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to save payment notification for user {}: {}", userId, e.getMessage());
        }
    }
}
