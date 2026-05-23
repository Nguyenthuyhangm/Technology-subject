package com.pricehawl.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertQueuePublisher {

    private static final String ALERT_QUEUE_KEY = "alert:queue";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Đẩy event giá mới vào Redis queue.
     * Crawler gọi cái này thay vì gọi checkAndTrigger() trực tiếp.
     */
    public void publish(UUID productId, int currentPrice) {
        try {
            String message = objectMapper.writeValueAsString(Map.of(
                "productId", productId.toString(),
                "currentPrice", currentPrice
            ));
            redisTemplate.opsForList().rightPush(ALERT_QUEUE_KEY, message);
            log.debug("Published alert event: productId={}, price={}", productId, currentPrice);
        } catch (Exception e) {
            log.error("Failed to publish alert event: {}", e.getMessage());
        }
    }
}