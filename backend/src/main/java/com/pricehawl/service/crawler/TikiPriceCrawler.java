package com.pricehawl.service.crawler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tiki crawler - gọi REST API trực tiếp.
 *
 * Tiki có public API: GET /api/v2/products/{id}
 * Extract product ID từ URL rồi gọi API.
 *
 * Ví dụ URL: https://tiki.vn/kem-chong-nang-anessa-p12345678.html
 * → product ID: 12345678
 */
@Component
public class TikiPriceCrawler implements PlatformPriceCrawler {

    private static final Logger log = LoggerFactory.getLogger(TikiPriceCrawler.class);

    private static final String PLATFORM = "tiki";
    private static final String API_BASE = "https://tiki.vn/api/v2/products/";
    private static final Pattern PRODUCT_ID_PATTERN = Pattern.compile("[pP](\\d+)\\.html");
    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public TikiPriceCrawler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(TIMEOUT)
                .build();
    }

    @Override
    public String platformName() {
        return PLATFORM;
    }

    @Override
    public PriceSnapshotDTO crawl(String productUrl) throws Exception {
        String productId = extractProductId(productUrl);
        if (productId == null) {
            throw new IllegalArgumentException("Cannot extract product ID from URL: " + productUrl);
        }

        String apiUrl = API_BASE + productId;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .timeout(TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .header("Accept", "application/json")
                .header("Referer", "https://tiki.vn/")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Tiki API returned status: " + response.statusCode());
        }

        JsonNode root = objectMapper.readTree(response.body());

        Integer price = asNullableInt(root.get("price"));
        Integer originalPrice = asNullableInt(root.get("original_price"));
        boolean inStock = root.path("stock_item").path("qty").asInt(0) > 0
                || root.path("inventory_status").asText("").equals("available");

        Double discountPct = null;
        if (originalPrice != null && price != null && originalPrice > price) {
            discountPct = ((double)(originalPrice - price) / originalPrice) * 100;
        }

        PriceSnapshotDTO dto = new PriceSnapshotDTO();
        dto.setPrice(price);
        dto.setOriginalPrice(originalPrice);
        dto.setDiscountPct(discountPct);
        dto.setInStock(inStock);
        dto.setStatusText(inStock ? "Còn hàng" : "Hết hàng");
        dto.setCrawledAt(LocalDateTime.now());
        dto.setSourceUrl(productUrl);

        log.debug("Tiki crawl OK | url={} | price={} | inStock={}", productUrl, price, inStock);
        return dto;
    }

    private String extractProductId(String url) {
        if (url == null) return null;
        Matcher matcher = PRODUCT_ID_PATTERN.matcher(url);
        return matcher.find() ? matcher.group(1) : null;
    }

    private Integer asNullableInt(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return node.isNumber() ? node.asInt() : null;
    }
}