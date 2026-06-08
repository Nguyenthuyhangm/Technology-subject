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

    /**
     * Gửi notification khi on-demand crawl hoàn thành.
     * User sẽ thấy trong bell notification trên web.
     *
     * Dùng REQUIRES_NEW để notification được lưu ngay cả khi
     * transaction cha (crawl job) có vấn đề.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveCrawlCompleteNotification(UUID userId, String productName, UUID productId) {
        try {
            // Cắt tên nếu quá dài để message không bị vỡ layout
            String shortName = productName != null && productName.length() > 60
                ? productName.substring(0, 57) + "..."
                : productName;

            notificationRepository.save(Notification.builder()
                .userId(userId)
                .productId(productId)
                .title("Đã tìm thấy sản phẩm! 🎉")
                .message("Chúng tôi đã tìm thấy \"" + shortName +
                         "\" trên nhiều sàn. Nhấn để xem so sánh giá.")
                .isRead(false)
                .build());

            log.info("Crawl complete notification saved | userId={} | productId={}", userId, productId);
        } catch (Exception e) {
            log.warn("Failed to save crawl complete notification for user {}: {}",
                     userId, e.getMessage());
        }
    }
}