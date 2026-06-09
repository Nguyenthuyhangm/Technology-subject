package com.pricehawl.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertQueuePublisherTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ListOperations<String, String> listOperations;

    private ObjectMapper objectMapper;

    private AlertQueuePublisher publisher;

    @BeforeEach
    void setUp() {

        objectMapper = new ObjectMapper();

        publisher = new AlertQueuePublisher(
                redisTemplate,
                objectMapper
        );

        when(redisTemplate.opsForList())
                .thenReturn(listOperations);
    }

    // =====================================================
    // NORMAL PUBLISH
    // =====================================================

    @Test
    void publish_validMessage_shouldPushToQueue() {

        UUID productId = UUID.randomUUID();

        when(listOperations.size("alert:queue"))
                .thenReturn(10L);

        publisher.publish(productId, 99000);

        verify(listOperations)
                .rightPush(
                        eq("alert:queue"),
                        contains(productId.toString())
                );
    }

    // =====================================================
    // EMPTY QUEUE
    // =====================================================

    @Test
    void publish_nullQueueSize_shouldStillPublish() {

        UUID productId = UUID.randomUUID();

        when(listOperations.size("alert:queue"))
                .thenReturn(null);

        publisher.publish(productId, 100000);

        verify(listOperations)
                .rightPush(
                        eq("alert:queue"),
                        contains(productId.toString())
                );
    }

    // =====================================================
    // QUEUE FULL
    // =====================================================

    @Test
    void publish_queueFull_shouldDropEvent() {

        UUID productId = UUID.randomUUID();

        when(listOperations.size("alert:queue"))
                .thenReturn(1000L);

        publisher.publish(productId, 100000);

        verify(listOperations, never())
                .rightPush(anyString(), anyString());
    }

    @Test
    void publish_queueOverLimit_shouldDropEvent() {

        UUID productId = UUID.randomUUID();

        when(listOperations.size("alert:queue"))
                .thenReturn(1200L);

        publisher.publish(productId, 100000);

        verify(listOperations, never())
                .rightPush(anyString(), anyString());
    }

    // =====================================================
    // VERIFY JSON CONTENT
    // =====================================================

    @Test
    void publish_shouldSerializeCorrectJson() {

        UUID productId = UUID.randomUUID();

        when(listOperations.size("alert:queue"))
                .thenReturn(0L);

        publisher.publish(productId, 123456);

        verify(listOperations)
                .rightPush(
                        eq("alert:queue"),
                        argThat(msg ->
                                msg.contains(productId.toString())
                                        && msg.contains("123456")
                        )
                );
    }

    // =====================================================
    // REDIS ERROR
    // =====================================================

    @Test
    void publish_redisThrows_shouldNotCrash() {

        UUID productId = UUID.randomUUID();

        when(listOperations.size("alert:queue"))
                .thenThrow(new RuntimeException("Redis down"));

        assertDoesNotThrow(() ->
                publisher.publish(productId, 100000)
        );
    }

    // =====================================================
    // PUSH ERROR
    // =====================================================

    @Test
    void publish_pushThrows_shouldNotCrash() {

        UUID productId = UUID.randomUUID();

        when(listOperations.size("alert:queue"))
                .thenReturn(1L);

        doThrow(new RuntimeException("Push failed"))
                .when(listOperations)
                .rightPush(anyString(), anyString());

        assertDoesNotThrow(() ->
                publisher.publish(productId, 100000)
        );
    }

    // =====================================================
    // OBJECT MAPPER ERROR
    // =====================================================

    @Test
    void publish_objectMapperError_shouldNotCrash() {

        ObjectMapper brokenMapper = mock(ObjectMapper.class);

        AlertQueuePublisher service =
                new AlertQueuePublisher(
                        redisTemplate,
                        brokenMapper
                );

        UUID productId = UUID.randomUUID();

        when(listOperations.size("alert:queue"))
                .thenReturn(1L);

        try {
            when(brokenMapper.writeValueAsString(any()))
                    .thenThrow(new RuntimeException("JSON error"));
        } catch (Exception ignored) {
        }

        assertDoesNotThrow(() ->
                service.publish(productId, 100000)
        );
    }
}