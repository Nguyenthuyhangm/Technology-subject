package com.pricehawl.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Service
public class AccessTradeService {

    private static final String BASE_URL = "https://api.accesstrade.vn/v1";

    private final RestTemplate restTemplate;

    @Value("${accesstrade.api-key}")
    private String apiKey;

    public AccessTradeService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(5_000);
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Lấy danh sách giao dịch từ AccessTrade
     * @param since ISO format, ví dụ "2026-01-01T00:00:00Z"
     * @param until ISO format, ví dụ "2026-05-24T23:59:59Z"
     * @param merchant tên merchant, ví dụ "tikivn" hoặc null để lấy tất cả
     */
    public Object getTransactions(String since, String until, String merchant, Integer status) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Token " + apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(BASE_URL + "/transactions")
                .queryParam("since", since)
                .queryParam("until", until)
                .queryParam("limit", 100);

            if (merchant != null && !merchant.isBlank()) {
                builder.queryParam("merchant", merchant);
            }
            if (status != null) {
                builder.queryParam("status", status);
            }

            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<Object> response = restTemplate.exchange(
                builder.toUriString(),
                HttpMethod.GET,
                request,
                Object.class
            );

            return response.getBody();
        } catch (Exception e) {
            log.error("Failed to fetch AccessTrade transactions: {}", e.getMessage());
            throw new RuntimeException("Không thể lấy dữ liệu từ AccessTrade: " + e.getMessage());
        }
    }
}