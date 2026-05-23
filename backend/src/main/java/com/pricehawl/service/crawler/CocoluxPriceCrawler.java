package com.pricehawl.service.crawler;

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
 * Cocolux crawler - parse HTML trực tiếp.
 *
 * Cocolux nhúng ProductId và FinalPrice vào HTML:
 *   <input type="hidden" id="ProductId" value="45549" />
 *   <input type="hidden" id="FinalPrice" value="489000" />
 *
 * Strategy:
 * 1. Fetch HTML trang sản phẩm
 * 2. Extract ProductId và FinalPrice bằng regex
 * 3. Gọi API groupproducts?contentId={ProductId} để lấy price + originalPrice + stock
 */
@Component
public class CocoluxPriceCrawler implements PlatformPriceCrawler {

    private static final Logger log = LoggerFactory.getLogger(CocoluxPriceCrawler.class);

    private static final String PLATFORM = "cocolux";
    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    // Pattern extract ProductId từ HTML
    private static final Pattern PRODUCT_ID_PATTERN =
            Pattern.compile("<input[^>]+id=\"ProductId\"[^>]+value=\"(\\d+)\"");

    // Pattern extract FinalPrice từ HTML (fallback nếu API fail)
    private static final Pattern FINAL_PRICE_PATTERN =
            Pattern.compile("<input[^>]+id=\"FinalPrice\"[^>]+value=\"([\\d,]+)\"");

    // Pattern extract giá gốc từ HTML
    private static final Pattern ORIGINAL_PRICE_PATTERN =
            Pattern.compile("class=\"price-old[^\"]*\"[^>]*>[^<]*([\\d\\.]+)[^<]*</");

    private static final String GROUP_PRODUCTS_API =
            "https://cocolux.com/api/GetData/groupproducts?contentId=";

    private final HttpClient httpClient;

    public CocoluxPriceCrawler() {
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

        // Extract ProductId
        String productId = extractByPattern(html, PRODUCT_ID_PATTERN);
        if (productId == null) {
            throw new RuntimeException("Cannot extract ProductId from Cocolux page: " + productUrl);
        }

        // Extract FinalPrice từ HTML (giá sale hiện tại)
        String finalPriceStr = extractByPattern(html, FINAL_PRICE_PATTERN);
        Integer finalPrice = parsePrice(finalPriceStr);

        if (finalPrice == null || finalPrice <= 0) {
            throw new RuntimeException("Cannot extract FinalPrice from Cocolux page: " + productUrl);
        }

        // Gọi API để lấy thêm originalPrice và stock
        Integer originalPrice = null;
        boolean inStock = true;

        try {
            String apiResponse = fetchApi(GROUP_PRODUCTS_API + productId);
            originalPrice = extractOriginalPriceFromApi(apiResponse);
            inStock = extractInStockFromApi(apiResponse);
        } catch (Exception e) {
            log.debug("Cocolux API call failed, using HTML data only: {}", e.getMessage());
            // Fallback: dùng price từ HTML, không có originalPrice
        }

        Double discountPct = null;
        if (originalPrice != null && originalPrice > finalPrice) {
            discountPct = ((double)(originalPrice - finalPrice) / originalPrice) * 100;
        }

        PriceSnapshotDTO dto = new PriceSnapshotDTO();
        dto.setPrice(finalPrice);
        dto.setOriginalPrice(originalPrice);
        dto.setDiscountPct(discountPct);
        dto.setInStock(inStock);
        dto.setStatusText(inStock ? "Còn hàng" : "Hết hàng");
        dto.setCrawledAt(LocalDateTime.now());
        dto.setSourceUrl(productUrl);

        log.debug("Cocolux crawl OK | url={} | productId={} | price={} | originalPrice={} | inStock={}",
                productUrl, productId, finalPrice, originalPrice, inStock);

        return dto;
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

        if (response.statusCode() == 404) {
            throw new RuntimeException("Product not found (404) on Cocolux: " + url);
        }
        if (response.statusCode() != 200) {
            throw new RuntimeException("Cocolux returned HTTP " + response.statusCode());
        }
        return response.body();
    }

    private String fetchApi(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .header("Accept", "application/json")
                .header("Referer", "https://cocolux.com/")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Cocolux API returned " + response.statusCode());
        }
        return response.body();
    }

    private String extractByPattern(String html, Pattern pattern) {
        Matcher m = pattern.matcher(html);
        return m.find() ? m.group(1) : null;
    }

    private Integer extractOriginalPriceFromApi(String json) {
        // Tìm "price": 298000 (giá gốc trong API response)
        Matcher m = Pattern.compile("\"price\"\\s*:\\s*(\\d+)").matcher(json);
        if (m.find()) {
            int price = Integer.parseInt(m.group(1));
            if (price > 1000) return price;
        }
        // Fallback: tìm "priceOld"
        Matcher m2 = Pattern.compile("\"priceOld\"\\s*:\\s*(\\d+)").matcher(json);
        if (m2.find()) {
            int price = Integer.parseInt(m2.group(1));
            if (price > 1000) return price;
        }
        return null;
    }

    private boolean extractInStockFromApi(String json) {
        // totalStock > 0 thì còn hàng
        Matcher m = Pattern.compile("\"totalStock\"\\s*:\\s*(\\d+)").matcher(json);
        if (m.find()) {
            return Integer.parseInt(m.group(1)) > 0;
        }
        return true; // default: còn hàng
    }

    private Integer parsePrice(String priceStr) {
        if (priceStr == null || priceStr.isBlank()) return null;
        try {
            return Integer.parseInt(priceStr.replaceAll("[^\\d]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}