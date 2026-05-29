package com.pricehawl.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiLlmClient {

    // Thêm : đằng sau để nếu không tìm thấy key trong yml/env, Spring sẽ gán chuỗi rỗng thay vì báo lỗi sập app
    @Value("${ai.base-url:}")
    private String baseUrl;

    @Value("${ai.api-key:}")
    private String apiKey;

    // Thiết lập model mặc định nếu không có cấu hình
    @Value("${ai.model:gpt-3.5-turbo}")
    private String model;

    public String generateAnswer(String systemPrompt, String userPrompt) {
        // Đoạn check này của bạn bây giờ sẽ hoạt động an toàn khi thiếu API Key ở môi trường dev
        if (apiKey == null || apiKey.isBlank() || baseUrl.isBlank()) {
            System.err.println("AI features are disabled: Missing API Key or Base URL.");
            return null;
        }

        try {
            WebClient client = WebClient.builder()
                    .baseUrl(baseUrl)
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, "application/json")
                    .build();

            Map<String, Object> body = Map.of(
                    "model", model,
                    "temperature", 0.2,
                    "max_tokens", 300,
                    "messages", List.of(
                            Map.of(
                                    "role", "system",
                                    "content", systemPrompt
                            ),
                            Map.of(
                                    "role", "user",
                                    "content", userPrompt
                            )
                    )
            );

            JsonNode response = client.post()
                    .uri("/chat/completions")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(20))
                    .block();

            if (response == null) {
                return null;
            }

            JsonNode contentNode = response.at("/choices/0/message/content");
            if (contentNode.isMissingNode()) {
                return null;
            }

            return contentNode.asText();

        } catch (Exception e) {
            System.err.println("AI call failed: " + e.getMessage());
            return null;
        }
    }
}