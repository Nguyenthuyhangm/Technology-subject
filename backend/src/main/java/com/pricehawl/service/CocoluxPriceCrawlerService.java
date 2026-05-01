package com.pricehawl.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.concurrent.TimeUnit;

@Service
public class CocoluxPriceCrawlerService {

    private final ObjectMapper objectMapper;

    /**
     * config từ application.yml
     */
    @Value("${pricehawk.crawler.node-binary:npx}")
    private String nodeBinary;

    @Value("${pricehawk.crawler.cocolux-refresh-script}")
    private String cocoluxRefreshScriptPath;

    @Value("${pricehawk.crawler.timeout-seconds:90}")
    private long timeoutSeconds;

    public CocoluxPriceCrawlerService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public PriceSnapshotDTO crawlPriceSnapshot(String productUrl) {
        if (productUrl == null || productUrl.isBlank()) {
            throw new IllegalArgumentException("productUrl must not be blank");
        }

        Process process = null;

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    nodeBinary,
                    "tsx",
                    cocoluxRefreshScriptPath,
                    productUrl
            );

            // ❗ KHÔNG merge stderr vào stdout (để debug rõ)
            pb.redirectErrorStream(false);

            // ===== DEBUG TRƯỚC KHI RUN =====
            System.out.println("========== CRAWLER DEBUG ==========");
            System.out.println("nodeBinary = " + nodeBinary);
            System.out.println("scriptPath = " + cocoluxRefreshScriptPath);
            System.out.println("productUrl = " + productUrl);
            System.out.println("===================================");

            process = pb.start();

            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("Crawler timeout after " + timeoutSeconds + " seconds");
            }

            int exitCode = process.exitValue();

            // ===== DEBUG SAU KHI RUN =====
            System.out.println("========== CRAWLER RESULT ==========");
            System.out.println("stdout = " + stdout);
            System.out.println("stderr = " + stderr);
            System.out.println("exitCode = " + exitCode);
            System.out.println("====================================");

            String rawOutput = stdout.trim();

            if (rawOutput.isBlank()) {
                throw new RuntimeException("Empty stdout. stderr=" + stderr);
            }

            // 👉 tìm JSON dòng cuối
            String[] lines = rawOutput.split("\\R");
            String jsonLine = null;

            for (int i = lines.length - 1; i >= 0; i--) {
                String line = lines[i].trim();
                if (line.startsWith("{") && line.endsWith("}")) {
                    jsonLine = line;
                    break;
                }
            }

            if (jsonLine == null) {
                throw new RuntimeException("No JSON found. stdout=" + rawOutput);
            }

            JsonNode root = objectMapper.readTree(jsonLine);

            // 👉 handle error từ crawler
            if (root.has("error")) {
                throw new RuntimeException(
                        "Crawler error: " + root.path("message").asText()
                );
            }

            if (exitCode != 0) {
                throw new RuntimeException("Exit code != 0: " + exitCode);
            }

            // 👉 map DTO
            PriceSnapshotDTO dto = new PriceSnapshotDTO();
            dto.setPrice(asNullableInt(root.get("price")));
            dto.setOriginalPrice(asNullableInt(root.get("originalPrice")));
            dto.setDiscountPct(asNullableDouble(root.get("discountPct")));
            dto.setInStock(asBooleanDefault(root.get("inStock"), false));
            dto.setStatusText(dto.getInStock() ? "Còn hàng" : "Hết hàng");
            dto.setCrawledAt(parseCrawledAt(root.path("crawledAt").asText(null)));
            dto.setSourceUrl(productUrl);

            return dto;

        } catch (Exception e) {
            throw new RuntimeException("Failed to crawl: " + productUrl, e);
        } finally {
            if (process != null) {
                process.destroy();
            }
        }
    }

    // ================= HELPER =================

    private String readStream(java.io.InputStream inputStream) throws Exception {
        StringBuilder sb = new StringBuilder();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(inputStream, StandardCharsets.UTF_8)
        )) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append(System.lineSeparator());
            }
        }

        return sb.toString();
    }

    private Integer asNullableInt(JsonNode node) {
        if (node == null || node.isNull()) return null;

        if (node.isNumber()) return node.asInt();

        if (node.isTextual()) {
            String text = node.asText().trim();
            if (text.isEmpty()) return null;
            return Integer.parseInt(text);
        }

        return null;
    }

    private Double asNullableDouble(JsonNode node) {
        if (node == null || node.isNull()) return null;

        if (node.isNumber()) return node.asDouble();

        if (node.isTextual()) {
            String text = node.asText().trim();
            if (text.isEmpty()) return null;
            return Double.parseDouble(text);
        }

        return null;
    }

    private boolean asBooleanDefault(JsonNode node, boolean defaultValue) {
        if (node == null || node.isNull()) return defaultValue;

        if (node.isBoolean()) return node.asBoolean();

        if (node.isTextual()) {
            String text = node.asText().toLowerCase();
            return "true".equals(text);
        }

        return defaultValue;
    }

    private LocalDateTime parseCrawledAt(String value) {
        if (value == null || value.isBlank()) {
            return LocalDateTime.now();
        }

        try {
            return OffsetDateTime.parse(value).toLocalDateTime();
        } catch (Exception ignored) {}

        try {
            return LocalDateTime.parse(value);
        } catch (Exception ignored) {}

        return LocalDateTime.now();
    }
}