package com.pricehawl.service;

import com.pricehawl.entity.Notification;
import com.pricehawl.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void savePaymentNotification_Success() {
        // Prepare
        UUID userId = UUID.randomUUID();
        String title = "Thanh toán thành công";
        String message = "Gói Premium đã được kích hoạt";

        // Execute
        notificationService.savePaymentNotification(userId, title, message);

        // Verify: Kiểm tra xem repository có gọi hàm save ít nhất 1 lần không
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void savePaymentNotification_WhenException_ShouldLogAndNotThrow() {
        // Prepare
        UUID userId = UUID.randomUUID();
        
        // Sử dụng lenient() để tránh lỗi UnnecessaryStubbingException 
        // nếu Mockito thấy stub này không được dùng tới một cách nghiêm ngặt
        lenient().when(notificationRepository.save(any()))
                .thenThrow(new RuntimeException("Database error"));

        // Execute & Verify
        // Kiểm tra xem khi có lỗi Database, Service có "nuốt" lỗi (catch) 
        // và không ném ra ngoài làm sập ứng dụng hay không.
        assertDoesNotThrow(() -> 
            notificationService.savePaymentNotification(userId, "Title", "Message")
        );
        
        // Vẫn nên verify xem hàm save đã được cố gắng gọi hay chưa
        verify(notificationRepository, atLeastOnce()).save(any(Notification.class));
    }
}