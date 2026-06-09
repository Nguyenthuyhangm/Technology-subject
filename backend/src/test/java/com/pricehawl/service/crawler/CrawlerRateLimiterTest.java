package com.pricehawl.service.crawler;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CrawlerRateLimiterTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private CrawlerRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        rateLimiter = new CrawlerRateLimiter(redisTemplate);
    }

    @Test
    @DisplayName("Lần đầu gọi - Phải set expire")
    void testAcquireFirstTime() {
        when(valueOperations.increment(anyString())).thenReturn(1L);
        rateLimiter.acquire("tiki");
        verify(redisTemplate).expire(contains("tiki"), any(Duration.class));
    }

    @Test
    @DisplayName("Vượt ngưỡng giới hạn và có TTL - Nhánh True của toán tử điều kiện")
    void testAcquireExceedWithTtl() throws InterruptedException {
        when(valueOperations.increment(anyString())).thenReturn(11L);
        when(redisTemplate.getExpire(anyString())).thenReturn(2L); // ttl > 0

        rateLimiter.acquire("tiki");

        verify(redisTemplate).getExpire(contains("tiki"));
        verify(redisTemplate).delete(contains("tiki"));
    }

    @Test
    @DisplayName("Vượt ngưỡng nhưng TTL null hoặc <= 0 - Nhánh False của toán tử điều kiện")
    void testAcquireExceedNoTtl() throws InterruptedException {
        when(valueOperations.increment(anyString())).thenReturn(11L);
        when(redisTemplate.getExpire(anyString())).thenReturn(null); // Nhánh ttl == null

        rateLimiter.acquire("tiki");

        verify(redisTemplate).getExpire(anyString());
    }

    @Test
    @DisplayName("Platform không có trong danh sách - Sử dụng DEFAULT_LIMIT")
    void testAcquireDefaultLimit() {
        // Default limit là 5, ta giả lập count = 6 để vượt ngưỡng
        when(valueOperations.increment(anyString())).thenReturn(6L);
        when(redisTemplate.getExpire(anyString())).thenReturn(1L);

        rateLimiter.acquire("shopee"); // Platform lạ

        verify(valueOperations).increment(contains("shopee"));
    }

    @Test
    @DisplayName("Redis trả về count null - Phủ nhánh null check")
    void testAcquireCountNull() {
        when(valueOperations.increment(anyString())).thenReturn(null);
        
        rateLimiter.acquire("hasaki");
        
        // Không crash và không gọi expire
        verify(redisTemplate, never()).expire(anyString(), any());
    }

    @Test
    @DisplayName("Redis lỗi - Phủ nhánh catch Exception")
    void testAcquireRedisError() {
        when(valueOperations.increment(anyString())).thenThrow(new RuntimeException("Error"));
        rateLimiter.acquire("cocolux");
        verify(valueOperations).increment(anyString());
    }

    @Test
    @DisplayName("Bị Interrupted khi đang sleep")
    void testAcquireInterrupted() {
        when(valueOperations.increment(anyString())).thenReturn(100L);
        when(redisTemplate.getExpire(anyString())).thenReturn(1L);
        
        Thread.currentThread().interrupt(); // Đánh dấu interrupt
        rateLimiter.acquire("watsons");
        
        // Nhánh InterruptedException đã được thực thi
    }
}