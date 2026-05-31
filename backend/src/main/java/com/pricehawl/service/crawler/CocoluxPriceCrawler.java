package com.pricehawl.service.crawler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.concurrent.TimeUnit;

@Component
public class CocoluxPriceCrawler implements PlatformPriceCrawler {

    private static final Logger log = LoggerFactory.getLogger(CocoluxPriceCrawler.class);
    private static final String PLATFORM = "cocolux";

    @Value("${pricehawk.crawler.cocolux-script:backend/cocolux-price.js}")
    private String scriptPath;

    @Value("${pricehawk.crawler.timeout-seconds:90}")
    private long timeoutSeconds;

    private final ObjectMapper objectMapper;

    public CocoluxPriceCrawler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String platformName() {
        return PLATFORM;
    }

    @Override
    public PriceSnapshotDTO crawl(String productUrl) throws Exception {
        Process process = null;
        try {
            ProcessBuilder pb = new ProcessBuilder("node", scriptPath, productUrl);
            pb.redirectErrorStream(false);
            pb.directory(new File(System.getProperty("user.dir")));

            process = pb.start();

            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("Cocolux crawler timeout after " + timeoutSeconds + "s");
            }

            log.debug("Cocolux stdout: {}", stdout.trim());
            if (!stderr.isBlank()) {
                log.debug("Cocolux stderr: {}", stderr.trim());
            }

            // Tìm dòng JSON trong stdout
            String jsonLine = null;
            for (String line : stdout.split("\\R")) {
                line = line.trim();
                if (line.startsWith("{") && line.endsWith("}")) {
                    jsonLine = line;
                    break;
                }
            }

            if (jsonLine == null) {
                throw new RuntimeException("No JSON from Cocolux script. stdout=" + stdout);
            }

            JsonNode root = objectMapper.readTree(jsonLine);
            if (root.path("error").asBoolean(false)) {
                throw new RuntimeException("Cocolux script error: " + root.path("message").asText());
            }

            Integer price = asNullableInt(root.get("price"));
            Integer originalPrice = asNullableInt(root.get("originalPrice"));
            Double discountPct = asNullableDouble(root.get("discountPct"));
            boolean inStock = root.path("inStock").asBoolean(true);

            PriceSnapshotDTO dto = new PriceSnapshotDTO();
            dto.setPrice(price);
            dto.setOriginalPrice(originalPrice);
            dto.setDiscountPct(discountPct);
            dto.setInStock(inStock);
            dto.setStatusText(inStock ? "Còn hàng" : "Hết hàng");
            dto.setCrawledAt(parseCrawledAt(root.path("crawledAt").asText(null)));
            dto.setSourceUrl(productUrl);

            log.debug("Cocolux crawl OK | url={} | price={} | originalPrice={} | inStock={}",
                    productUrl, price, originalPrice, inStock);

            return dto;

        } finally {
            if (process != null) process.destroy();
        }
    }

    private String readStream(java.io.InputStream is) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append(System.lineSeparator());
            }
        }
        return sb.toString();
    }

    private Integer asNullableInt(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return node.isNumber() ? node.asInt() : null;
    }

    private Double asNullableDouble(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return node.isNumber() ? node.asDouble() : null;
    }

    private LocalDateTime parseCrawledAt(String value) {
        if (value == null || value.isBlank()) return LocalDateTime.now();
        try {
            return OffsetDateTime.parse(value).toLocalDateTime();
        } catch (Exception ignored) {}
        return LocalDateTime.now();
    }
}