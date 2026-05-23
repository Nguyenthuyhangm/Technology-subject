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
 * Hasaki crawler - parse JSON embedded trong HTML (script tag).
 *
 * Hasaki nhúng dữ liệu sản phẩm vào thẻ <script type="application/ld+json">
 * hoặc window.__INITIAL_STATE__ / __NEXT_DATA__
 *
 * Strategy:
 * 1. Fetch HTML trang sản phẩm
 * 2. Extract JSON từ script tag
 * 3. Parse giá từ JSON
 */
@Component
public class HasakiPriceCrawler implements PlatformPriceCrawler {

    private static final Logger log = LoggerFactory.getLogger(HasakiPriceCrawler.class);

    private static final String PLATFORM = "hasaki";
    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    // Hasaki nhúng data vào __NEXT_DATA__ hoặc ld+json
    private static final Pattern NEXT_DATA_PATTERN =
            Pattern.compile("<script id=\"__NEXT_DATA__\"[^>]*>(.*?)</script>", Pattern.DOTALL);
    private static final Pattern LD_JSON_PATTERN =
            Pattern.compile("<script type=\"application/ld\\+json\">(.*?)</script>", Pattern.DOTALL);
    // Fallback: tìm giá trong HTML thuần
    private static final Pattern PRICE_PATTERN =
            Pattern.compile("\"price\"\\s*:\\s*(\\d+)");
    private static final Pattern OFFER_PRICE_PATTERN =
            Pattern.compile("\"offers\"[^}]*\"price\"\\s*:\\s*(\\d+)");

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public HasakiPriceCrawler(ObjectMapper objectMapper) {
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

        // Strategy 1: __NEXT_DATA__ JSON
        PriceSnapshotDTO result = tryParseNextData(html, productUrl);
        if (result != null) return result;

        // Strategy 2: ld+json
        result = tryParseLdJson(html, productUrl);
        if (result != null) return result;

        // Strategy 3: regex fallback
        result = tryParseRegex(html, productUrl);
        if (result != null) return result;

        throw new RuntimeException("Cannot extract price from Hasaki page: " + productUrl);
    }

    private String fetchHtml(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "vi-VN,vi;q=0.9")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Hasaki returned status: " + response.statusCode());
        }
        return response.body();
    }

    private PriceSnapshotDTO tryParseNextData(String html, String sourceUrl) {
        try {
            Matcher m = NEXT_DATA_PATTERN.matcher(html);
            if (!m.find()) return null;

            JsonNode root = objectMapper.readTree(m.group(1));

            // Hasaki __NEXT_DATA__ path thường là: props.pageProps.product
            JsonNode product = root.path("props").path("pageProps").path("product");
            if (product.isMissingNode()) {
                product = root.path("props").path("pageProps").path("productDetail");
            }
            if (product.isMissingNode()) return null;

            Integer price = asNullableInt(product.get("price"));
            if (price == null) price = asNullableInt(product.get("special_price"));
            Integer originalPrice = asNullableInt(product.get("price"));
            if (price == null) return null;

            boolean inStock = product.path("is_in_stock").asBoolean(true);

            Double discountPct = null;
            if (originalPrice != null && price != null && originalPrice > price) {
                discountPct = ((double)(originalPrice - price) / originalPrice) * 100;
            }

            return buildDto(price, originalPrice, discountPct, inStock, sourceUrl);

        } catch (Exception e) {
            log.debug("Hasaki __NEXT_DATA__ parse failed: {}", e.getMessage());
            return null;
        }
    }

    private PriceSnapshotDTO tryParseLdJson(String html, String sourceUrl) {
        try {
            Matcher m = LD_JSON_PATTERN.matcher(html);
            while (m.find()) {
                try {
                    JsonNode root = objectMapper.readTree(m.group(1));
                    // ld+json Product schema
                    if (!"Product".equals(root.path("@type").asText())) continue;

                    JsonNode offers = root.path("offers");
                    Integer price = asNullableInt(offers.get("price"));
                    if (price == null) continue;

                    String availability = offers.path("availability").asText("");
                    boolean inStock = availability.contains("InStock");

                    return buildDto(price, null, null, inStock, sourceUrl);
                } catch (Exception ignored) {}
            }
            return null;
        } catch (Exception e) {
            log.debug("Hasaki ld+json parse failed: {}", e.getMessage());
            return null;
        }
    }

    private PriceSnapshotDTO tryParseRegex(String html, String sourceUrl) {
        try {
            // Tìm offer price
            Matcher m = OFFER_PRICE_PATTERN.matcher(html);
            if (m.find()) {
                int price = Integer.parseInt(m.group(1));
                if (price > 1000) { // sanity check
                    return buildDto(price, null, null, true, sourceUrl);
                }
            }

            // Tìm price đơn giản
            Matcher m2 = PRICE_PATTERN.matcher(html);
            while (m2.find()) {
                int price = Integer.parseInt(m2.group(1));
                if (price > 10000) { // giá mỹ phẩm VN tối thiểu ~10k
                    return buildDto(price, null, null, true, sourceUrl);
                }
            }

            return null;
        } catch (Exception e) {
            log.debug("Hasaki regex parse failed: {}", e.getMessage());
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
        log.debug("Hasaki crawl OK | url={} | price={} | inStock={}", sourceUrl, price, inStock);
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