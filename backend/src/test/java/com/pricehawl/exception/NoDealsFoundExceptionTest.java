package com.pricehawl.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class NoDealsFoundExceptionTest {

    @Test
    @DisplayName("Test khởi tạo NoDealsFoundException với message")
    void testNoDealsFoundExceptionMessage() {
        String message = "Không tìm thấy deal nào phù hợp";
        NoDealsFoundException exception = new NoDealsFoundException(message);

        // Kiểm tra xem message có được lưu đúng vào cha (RuntimeException) không
        assertEquals(message, exception.getMessage());
        
        // Đảm bảo exception đúng kiểu dữ liệu
        assertTrue(exception instanceof RuntimeException);
    }
}