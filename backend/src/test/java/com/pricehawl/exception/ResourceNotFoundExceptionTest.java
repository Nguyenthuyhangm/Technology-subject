package com.pricehawl.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ResourceNotFoundExceptionTest {

    @Test
    @DisplayName("Test khởi tạo ResourceNotFoundException với message")
    void testResourceNotFoundException() {
        String message = "Resource not found with ID: 123";
        ResourceNotFoundException exception = new ResourceNotFoundException(message);

        // Kiểm tra message được truyền vào super class đúng cách
        assertEquals(message, exception.getMessage());
        
        // Kiểm tra tính kế thừa
        assertInstanceOf(RuntimeException.class, exception);
    }
}