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
 * Guardian VN crawler - parse JSON embedded trong HTML.
 *
 * Guardian VN (guardian.com.vn) dùng Magento/custom platform.
 * Strategy: fetch HTML → extract giá từ JSON-LD hoặc meta tags.
 *
 * Ví dụ URL: https://www.guardian.com.vn/san-pham/kem-chong-nang-abc.html
 */
@Component
public class GuardianPriceCrawler implements PlatformPriceCrawler {

    private static final Logger log = LoggerFactory.getLogger(GuardianPriceCrawler.class);

    private static final String PLATFORM = "guardian";
    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    // Guardian nhúng data vào script hoặc meta tags
    private static final Pattern LD_JSON_PATTERN =
            Pattern.compile("<script type=\"application/ld\\+json\">(.*?)</script>", Pattern.DOTALL);
    private static final Pattern META_PRICE_PATTERN =
            Pattern.compile("<meta[^>]+property=\"product:price:amount\"[^>]+content=\"([\\d\\.]+)\"");
    private static final Pattern META_AVAILABILITY_PATTERN =
            Pattern.compile("<meta[^>]+property=\"product:availability\"[^>]+content=\"([^\"]+)\"");
    // Guardian có thể dùng window.__INITIAL_STATE__ hoặc data-price attribute
    private static final Pattern DATA_PRICE_PATTERN =
            Pattern.compile("data-price=\"([\\d]+)\"");
    private static final Pattern FINAL_PRICE_PATTERN =
            Pattern.compile("\"finalPrice\"\\s*:\\s*\\{[^}]*\"amount\"\\s*:\\s*([\\d]+)");

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public GuardianPriceCrawler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(TIMEOUT)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    @Override
    public String platformName() {
        return PLATFORM;
    }

    @Override
    public PriceSnapshotDTO crawl(String productUrl) throws Exception {
        String html = fetchHtml(productUrl);

        // Strategy 1: JSON-LD (Product schema)
        PriceSnapshotDTO result = tryParseLdJson(html, productUrl);
        if (result != null) return result;

        // Strategy 2: Open Graph meta tags
        result = tryParseMetaTags(html, productUrl);
        if (result != null) return result;

        // Strategy 3: data-price attribute (Magento pattern)
        result = tryParseDataPrice(html, productUrl);
        if (result != null) return result;

        // Strategy 4: finalPrice JSON pattern
        result = tryParseFinalPrice(html, productUrl);
        if (result != null) return result;

        throw new RuntimeException("Cannot extract price from Guardian page: " + productUrl);
    }

    private String fetchHtml(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "vi-VN,vi;q=0.9,en;q=0.8")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Guardian returned HTTP " + response.statusCode());
        }
        return response.body();
    }

    private PriceSnapshotDTO tryParseLdJson(String html, String sourceUrl) {
        try {
            Matcher m = LD_JSON_PATTERN.matcher(html);
            while (m.find()) {
                try {
                    JsonNode root = objectMapper.readTree(m.group(1));
                    if (!"Product".equals(root.path("@type").asText())) continue;

                    JsonNode offers = root.path("offers");
                    if (offers.isMissingNode()) continue;

                    // offers có thể là array hoặc object đơn
                    JsonNode offer = offers.isArray() ? offers.get(0) : offers;
                    if (offer == null) continue;

                    Integer price = asNullableInt(offer.get("price"));
                    if (price == null || price <= 0) continue;

                    String availability = offer.path("availability").asText("");
                    boolean inStock = availability.contains("InStock");

                    // Tìm originalPrice từ priceSpecification nếu có
                    Integer originalPrice = null;
                    JsonNode priceSpec = offer.path("priceSpecification");
                    if (!priceSpec.isMissingNode()) {
                        originalPrice = asNullableInt(priceSpec.get("price"));
                    }

                    Double discountPct = null;
                    if (originalPrice != null && originalPrice > price) {
                        discountPct = ((double)(originalPrice - price) / originalPrice) * 100;
                    }

                    return buildDto(price, originalPrice, discountPct, inStock, sourceUrl);
                } catch (Exception ignored) {}
            }
            return null;
        } catch (Exception e) {
            log.debug("Guardian ld+json parse failed: {}", e.getMessage());
            return null;
        }
    }

    private PriceSnapshotDTO tryParseMetaTags(String html, String sourceUrl) {
        try {
            Matcher priceMatcher = META_PRICE_PATTERN.matcher(html);
            if (!priceMatcher.find()) return null;

            String priceStr = priceMatcher.group(1).replaceAll("[^\\d]", "");
            if (priceStr.isEmpty()) return null;
            int price = Integer.parseInt(priceStr);
            if (price <= 0) return null;

            boolean inStock = true;
            Matcher availMatcher = META_AVAILABILITY_PATTERN.matcher(html);
            if (availMatcher.find()) {
                inStock = availMatcher.group(1).toLowerCase().contains("in stock")
                        || availMatcher.group(1).toLowerCase().contains("instock");
            }

            return buildDto(price, null, null, inStock, sourceUrl);
        } catch (Exception e) {
            log.debug("Guardian meta tags parse failed: {}", e.getMessage());
            return null;
        }
    }

    private PriceSnapshotDTO tryParseDataPrice(String html, String sourceUrl) {
        try {
            Matcher m = DATA_PRICE_PATTERN.matcher(html);
            if (!m.find()) return null;
            int price = Integer.parseInt(m.group(1));
            if (price <= 1000) return null; // sanity check
            return buildDto(price, null, null, true, sourceUrl);
        } catch (Exception e) {
            log.debug("Guardian data-price parse failed: {}", e.getMessage());
            return null;
        }
    }

    private PriceSnapshotDTO tryParseFinalPrice(String html, String sourceUrl) {
        try {
            Matcher m = FINAL_PRICE_PATTERN.matcher(html);
            if (!m.find()) return null;
            int price = Integer.parseInt(m.group(1));
            if (price <= 1000) return null;
            return buildDto(price, null, null, true, sourceUrl);
        } catch (Exception e) {
            log.debug("Guardian finalPrice parse failed: {}", e.getMessage());
            return null;
        }
    }

    private PriceSnapshotDTO buildDto(Integer price, Integer originalPrice,
                                      Double discountPct, boolean inStock, String sourceUrl) {
        PriceSnapshotDTO dto = new PriceSnapshotDTO();
        dto.setPrice(price);
        dto.setOriginalPrice(originalPrice);
        dto.setDiscountPct(discountPct);
        dto.setInStock(inStock);
        dto.setStatusText(inStock ? "Còn hàng" : "Hết hàng");
        dto.setCrawledAt(LocalDateTime.now());
        dto.setSourceUrl(sourceUrl);
        log.debug("Guardian crawl OK | url={} | price={} | inStock={}", sourceUrl, price, inStock);
        return dto;
    }

    private Integer asNullableInt(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isNumber()) return node.asInt();
        if (node.isTextual()) {
            try { return Integer.parseInt(node.asText().replaceAll("[^\\d]", "")); }
            catch (NumberFormatException ignored) { return null; }
        }
        return null;
    }
}