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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertQueueConsumerTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private PriceAlertService priceAlertService;

    @Mock
    private ListOperations<String, String> listOperations;

    @InjectMocks
    private AlertQueueConsumer consumer;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {

        consumer = new AlertQueueConsumer(
                redisTemplate,
                priceAlertService,
                objectMapper
        );

        when(redisTemplate.opsForList())
                .thenReturn(listOperations);
    }

    @Test
    void consume_emptyQueue_shouldDoNothing() {

        when(listOperations.leftPop("alert:queue"))
                .thenReturn(null);

        consumer.consume();

        verify(priceAlertService, never())
                .checkAndTrigger(any(), anyInt());
    }

    @Test
    void consume_singleValidMessage_shouldProcess() {

        UUID productId = UUID.randomUUID();

        String message = """
            {
              "productId":"%s",
              "currentPrice":99000
            }
            """.formatted(productId);

        when(listOperations.leftPop("alert:queue"))
                .thenReturn(message)
                .thenReturn(null);

        consumer.consume();

        verify(priceAlertService)
                .checkAndTrigger(productId, 99000);
    }

    @Test
    void consume_multipleMessages_shouldProcessAll() {

        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();

        String m1 = """
            {
              "productId":"%s",
              "currentPrice":100000
            }
            """.formatted(p1);

        String m2 = """
            {
              "productId":"%s",
              "currentPrice":200000
            }
            """.formatted(p2);

        when(listOperations.leftPop("alert:queue"))
                .thenReturn(m1)
                .thenReturn(m2)
                .thenReturn(null);

        consumer.consume();

        verify(priceAlertService)
                .checkAndTrigger(p1, 100000);

        verify(priceAlertService)
                .checkAndTrigger(p2, 200000);
    }

    @Test
    void consume_invalidJson_shouldSkipAndContinue() {

        UUID productId = UUID.randomUUID();

        String invalid = "{broken-json}";

        String valid = """
            {
              "productId":"%s",
              "currentPrice":150000
            }
            """.formatted(productId);

        when(listOperations.leftPop("alert:queue"))
                .thenReturn(invalid)
                .thenReturn(valid)
                .thenReturn(null);

        assertDoesNotThrow(() ->
                consumer.consume());

        verify(priceAlertService)
                .checkAndTrigger(productId, 150000);
    }

    @Test
    void consume_serviceThrows_shouldContinueProcessing() {

        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();

        String m1 = """
            {
              "productId":"%s",
              "currentPrice":100000
            }
            """.formatted(p1);

        String m2 = """
            {
              "productId":"%s",
              "currentPrice":200000
            }
            """.formatted(p2);

        when(listOperations.leftPop("alert:queue"))
                .thenReturn(m1)
                .thenReturn(m2)
                .thenReturn(null);

        doThrow(new RuntimeException("boom"))
                .when(priceAlertService)
                .checkAndTrigger(p1, 100000);

        assertDoesNotThrow(() ->
                consumer.consume());

        verify(priceAlertService)
                .checkAndTrigger(p2, 200000);
    }

    @Test
    void consume_moreThanBatchSize_shouldStopAt50() {

        String[] messages = new String[51];

        for (int i = 0; i < 51; i++) {
            messages[i] = """
                {
                  "productId":"%s",
                  "currentPrice":100000
                }
                """.formatted(UUID.randomUUID());
        }

        when(listOperations.leftPop("alert:queue"))
                .thenReturn(messages[0],
                        java.util.Arrays.copyOfRange(
                                messages,
                                1,
                                messages.length));

        consumer.consume();

        verify(priceAlertService, times(50))
                .checkAndTrigger(any(), anyInt());
    }

    @Test
    void consume_invalidUuid_shouldSkip() {

        String message = """
            {
              "productId":"abc",
              "currentPrice":100000
            }
            """;

        when(listOperations.leftPop("alert:queue"))
                .thenReturn(message)
                .thenReturn(null);

        assertDoesNotThrow(() ->
                consumer.consume());

        verify(priceAlertService, never())
                .checkAndTrigger(any(), anyInt());
    }
}