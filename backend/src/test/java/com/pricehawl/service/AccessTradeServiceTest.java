package com.pricehawl.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccessTradeServiceTest {

    private AccessTradeService service;

    @Mock
    private RestTemplate restTemplate;

    @BeforeEach
    void setup() {

        service = new AccessTradeService();

        ReflectionTestUtils.setField(
                service,
                "apiKey",
                "test-api-key"
        );

        ReflectionTestUtils.setField(
                service,
                "restTemplate",
                restTemplate
        );
    }

    @Test
    void getTransactions_successWithoutMerchantAndStatus() {

        ResponseEntity<Object> response =
                new ResponseEntity<>(
                        "SUCCESS",
                        HttpStatus.OK
                );

        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Object.class)
        )).thenReturn(response);

        Object result =
                service.getTransactions(
                        "2026-01-01",
                        "2026-01-31",
                        null,
                        null
                );

        assertEquals("SUCCESS", result);

        ArgumentCaptor<String> urlCaptor =
                ArgumentCaptor.forClass(String.class);

        verify(restTemplate)
                .exchange(
                        urlCaptor.capture(),
                        eq(HttpMethod.GET),
                        any(HttpEntity.class),
                        eq(Object.class)
                );

        String url = urlCaptor.getValue();

        assertTrue(url.contains("since=2026-01-01"));
        assertTrue(url.contains("until=2026-01-31"));
        assertTrue(url.contains("limit=100"));

        assertFalse(url.contains("merchant="));
        assertFalse(url.contains("status="));
    }

    @Test
    void getTransactions_successWithMerchantAndStatus() {

        ResponseEntity<Object> response =
                new ResponseEntity<>(
                        "SUCCESS",
                        HttpStatus.OK
                );

        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Object.class)
        )).thenReturn(response);

        Object result =
                service.getTransactions(
                        "2026-01-01",
                        "2026-01-31",
                        "tikivn",
                        1
                );

        assertEquals("SUCCESS", result);

        ArgumentCaptor<String> urlCaptor =
                ArgumentCaptor.forClass(String.class);

        verify(restTemplate)
                .exchange(
                        urlCaptor.capture(),
                        eq(HttpMethod.GET),
                        any(HttpEntity.class),
                        eq(Object.class)
                );

        String url = urlCaptor.getValue();

        assertTrue(url.contains("merchant=tikivn"));
        assertTrue(url.contains("status=1"));
    }

    @Test
    void getTransactions_blankMerchantShouldNotAddMerchantParam() {

        ResponseEntity<Object> response =
                new ResponseEntity<>(
                        "SUCCESS",
                        HttpStatus.OK
                );

        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Object.class)
        )).thenReturn(response);

        service.getTransactions(
                "2026-01-01",
                "2026-01-31",
                "   ",
                2
        );

        ArgumentCaptor<String> urlCaptor =
                ArgumentCaptor.forClass(String.class);

        verify(restTemplate)
                .exchange(
                        urlCaptor.capture(),
                        eq(HttpMethod.GET),
                        any(HttpEntity.class),
                        eq(Object.class)
                );

        String url = urlCaptor.getValue();

        assertFalse(url.contains("merchant="));
        assertTrue(url.contains("status=2"));
    }

    @Test
    void getTransactions_shouldThrowRuntimeExceptionWhenApiFails() {

        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Object.class)
        )).thenThrow(
                new RuntimeException("Connection timeout")
        );

        RuntimeException ex =
                assertThrows(
                        RuntimeException.class,
                        () -> service.getTransactions(
                                "2026-01-01",
                                "2026-01-31",
                                "tikivn",
                                1
                        )
                );

        assertTrue(
                ex.getMessage()
                        .contains("Không thể lấy dữ liệu từ AccessTrade")
        );
    }

    @Test
    void getTransactions_shouldSendAuthorizationHeader() {

        ResponseEntity<Object> response =
                new ResponseEntity<>(
                        "OK",
                        HttpStatus.OK
                );

        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Object.class)
        )).thenReturn(response);

        ArgumentCaptor<HttpEntity> entityCaptor =
                ArgumentCaptor.forClass(HttpEntity.class);

        service.getTransactions(
                "2026-01-01",
                "2026-01-31",
                null,
                null
        );

        verify(restTemplate)
                .exchange(
                        anyString(),
                        eq(HttpMethod.GET),
                        entityCaptor.capture(),
                        eq(Object.class)
                );

        HttpHeaders headers =
                entityCaptor.getValue()
                        .getHeaders();

        assertEquals(
                "Token test-api-key",
                headers.getFirst("Authorization")
        );

        assertEquals(
                MediaType.APPLICATION_JSON,
                headers.getContentType()
        );
    }
}

