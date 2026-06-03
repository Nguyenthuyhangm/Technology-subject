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
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class WatsonsPriceCrawler implements PlatformPriceCrawler {

    private static final Logger log = LoggerFactory.getLogger(WatsonsPriceCrawler.class);
    private static final String PLATFORM = "watsons";
    private static final Pattern PRODUCT_CODE_PATTERN =
            Pattern.compile("/p/((?:BP|WP)_[A-Za-z0-9]+)");
    private static final List<String> NODE_CANDIDATES = Arrays.asList(
            System.getenv("PRICEHAWK_CRAWLER_NODE_BINARY"),
            "node",
            "nodejs",
            "/usr/local/bin/node",
            "/usr/bin/node"
    );

    @Value("${pricehawk.crawler.watsons-script:watsons-price.js}")
    private String scriptPath;

    @Value("${pricehawk.crawler.timeout-seconds:60}")
    private long timeoutSeconds;

    private final ObjectMapper objectMapper;

    public WatsonsPriceCrawler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String platformName() {
        return PLATFORM;
    }

    @Override
    public PriceSnapshotDTO crawl(String productUrl) throws Exception {
        String productCode = extractProductCode(productUrl);
        if (productCode == null) {
            throw new IllegalArgumentException("Cannot extract product code from: " + productUrl);
        }

        String resolvedScriptPath = resolveScriptPath(scriptPath);

        Process process = null;
        try {
            process = startNodeProcess(resolvedScriptPath, productUrl);

            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("Watsons crawler timeout after " + timeoutSeconds + "s");
            }

            log.debug("Watsons stdout: {}", stdout.trim());
            if (!stderr.isBlank()) {
                log.debug("Watsons stderr: {}", stderr.trim());
            }

            String jsonLine = extractJsonLine(stdout + System.lineSeparator() + stderr);

            if (jsonLine == null) {
                throw new RuntimeException("No JSON from Watsons script. exitCode=" + process.exitValue() + " scriptPath=" + resolvedScriptPath + " stdout=" + stdout + " stderr=" + stderr);
            }

            JsonNode root = objectMapper.readTree(jsonLine);
            if (root.path("error").asBoolean(false)) {
                throw new RuntimeException("Watsons script error: " + root.path("message").asText());
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

            log.debug("Watsons crawl OK | code={} | price={} | originalPrice={} | inStock={}",
                    productCode, price, originalPrice, inStock);

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

    private String extractProductCode(String url) {
        if (url == null) return null;
        Matcher m = PRODUCT_CODE_PATTERN.matcher(url);
        return m.find() ? m.group(1) : null;
    }

    private String extractJsonLine(String output) {
        if (output == null || output.isBlank()) {
            return null;
        }

        for (String line : output.split("\\R")) {
            line = line.trim();
            if (line.startsWith("{") && line.endsWith("}")) {
                return line;
            }
        }

        return null;
    }

    private String resolveScriptPath(String configuredPath) {
        if (configuredPath == null || configuredPath.isBlank()) {
            throw new IllegalArgumentException("Watsons script path is empty");
        }

        Path directPath = Path.of(configuredPath);
        if (Files.exists(directPath)) {
            return directPath.toString();
        }

        String fileName = directPath.getFileName().toString();
        Path strippedBackendPrefix = Path.of(fileName);
        if (Files.exists(strippedBackendPrefix)) {
            return strippedBackendPrefix.toString();
        }

        Path backendRelativePath = Path.of("backend", fileName);
        if (Files.exists(backendRelativePath)) {
            return backendRelativePath.toString();
        }

        throw new IllegalArgumentException("Watsons crawler script not found. Tried: " + directPath + ", " + strippedBackendPrefix + ", " + backendRelativePath);
    }

    private Process startNodeProcess(String scriptPath, String productUrl) throws IOException {
        IOException lastException = null;
        for (String nodeBinary : NODE_CANDIDATES) {
            if (nodeBinary == null || nodeBinary.isBlank()) {
                continue;
            }

            ProcessBuilder pb = new ProcessBuilder(nodeBinary, scriptPath, productUrl);
            pb.redirectErrorStream(false);
            pb.directory(new File(System.getProperty("user.dir")));

            try {
                return pb.start();
            } catch (IOException ex) {
                lastException = ex;
            }
        }

        throw new IOException("Unable to start Node.js for Watsons crawler. Set PRICEHAWK_CRAWLER_NODE_BINARY or install Node.js in the runtime container.", lastException);
    }
}