package com.pricehawl.service.crawler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.http.HttpClient;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GuardianPriceCrawlerTest {

    private GuardianPriceCrawler crawler;
    private ObjectMapper objectMapper;
    private HttpClient mockHttpClient;
    private HttpResponse<String> mockResponse;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        objectMapper = new ObjectMapper();
        crawler = new GuardianPriceCrawler(objectMapper);
        mockHttpClient = mock(HttpClient.class);
        mockResponse = (HttpResponse<String>) mock(HttpResponse.class);
        ReflectionTestUtils.setField(crawler, "httpClient", mockHttpClient);
    }

    @Test
    @DisplayName("1. Vét sạch LD+JSON - Phủ nhánh Object đơn, PriceSpec và Discount")
    void testCrawlLdJsonFull() throws Exception {
        // Mock JSON-LD dạng OBJECT đơn (không phải array) để phủ nhánh offers.isArray() == false
        String html = "<html><script type=\"application/ld+json\">{" +
                "\"@type\":\"Product\"," +
                "\"offers\":{" +
                "  \"price\":100000," +
                "  \"availability\":\"InStock\"," +
                "  \"priceSpecification\":{\"price\":200000}" +
                "}" +
                "}</script></html>";
        
        setupMock(200, html);

        PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p1");
        assertNotNull(result);
        assertEquals(100000, result.getPrice());
        assertEquals(200000, result.getOriginalPrice());
        assertEquals(50.0, result.getDiscountPct());
    }

    @Test
    @DisplayName("2. Vét sạch FinalPrice Strategy - Phủ 100% logic regex")
    void testCrawlFinalPrice() throws Exception {
        String html = "<html>\"finalPrice\": {\"amount\": 500000}</html>";
        setupMock(200, html);

        PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p2");
        assertEquals(500000, result.getPrice());
    }

    @Test
    @DisplayName("3. Vét sạch DataPrice Strategy")
    void testCrawlDataPrice() throws Exception {
        String html = "<html><div data-price=\"350000\"></div></html>";
        setupMock(200, html);

        PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p3");
        assertEquals(350000, result.getPrice());
    }

    @Test
    @DisplayName("4. Vét sạch Meta Tags - Phủ nhánh Hết hàng")
    void testCrawlMetaTagsOut() throws Exception {
        String html = "<html><meta property=\"product:price:amount\" content=\"200000\">" +
                      "<meta property=\"product:availability\" content=\"out of stock\"></html>";
        setupMock(200, html);

        PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p4");
        assertFalse(result.getInStock());
    }

    @Test
    @DisplayName("5. Vét sạch asNullableInt - Phủ nhánh catch Exception")
    void testAsNullableIntExhaustive() {
        // Case: Text nhưng không có số -> Phủ khối catch (NumberFormatException)
        var textNodeNoDigits = objectMapper.valueToTree("KhôngCóSố");
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", textNodeNoDigits));

        // Case: Node không phải Number cũng không phải Text
        var boolNode = objectMapper.valueToTree(true);
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", boolNode));
        
        // Case: Number thật
        var numNode = objectMapper.valueToTree(150);
        assertEquals(150, (Integer) ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", numNode));
    }

    @Test
    @DisplayName("6. Vét sạch các nhánh lỗi crawl (RuntimeException)")
    void testCrawlFailures() throws Exception {
        // Case 1: HTTP Error
        setupMock(500, "Server Error");
        assertThrows(RuntimeException.class, () -> crawler.crawl("url"));

        // Case 2: HTML rỗng (Không trích xuất được gì)
        setupMock(200, "<html></html>");
        assertThrows(RuntimeException.class, () -> crawler.crawl("url"));
    }

    @Test
    @DisplayName("7. Helper test cho platformName")
    void testPlatformName() {
        assertEquals("guardian", crawler.platformName());
    }

    private void setupMock(int status, String body) throws Exception {
        reset(mockHttpClient);
        when(mockResponse.statusCode()).thenReturn(status);
        when(mockResponse.body()).thenReturn(body);
        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
    }
    // ===== BỔ SUNG CHO tryParseLdJson =====

@Test
@DisplayName("8. LdJson - Array offers, thiếu price -> fallback sang strategy khác")
void testCrawlLdJsonArrayOffers() throws Exception {
    // Phủ nhánh offers.isArray() == true
    String html = "<html><script type=\"application/ld+json\">{" +
            "\"@type\":\"Product\"," +
            "\"offers\":[{" +
            "  \"price\":75000," +
            "  \"availability\":\"OutOfStock\"" +
            "}]" +
            "}</script></html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p8");
    assertNotNull(result);
    assertEquals(75000, result.getPrice());
    assertFalse(result.getInStock());
}

@Test
@DisplayName("9. LdJson - Array offers, có discount object")
void testCrawlLdJsonArrayOffersWithDiscount() throws Exception {
    String html = "<html><script type=\"application/ld+json\">{" +
            "\"@type\":\"Product\"," +
            "\"offers\":[{" +
            "  \"price\":80000," +
            "  \"availability\":\"InStock\"," +
            "  \"priceSpecification\":{\"price\":160000}" +
            "}]" +
            "}</script></html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p9");
    assertEquals(80000, result.getPrice());
    assertEquals(160000, result.getOriginalPrice());
    assertEquals(50.0, result.getDiscountPct());
}

@Test
@DisplayName("10. LdJson - @type không phải Product -> bỏ qua, fallback sang FinalPrice")
void testCrawlLdJsonNonProductType() throws Exception {
    // Phủ nhánh @type != Product
    String html = "<html>" +
            "<script type=\"application/ld+json\">{\"@type\":\"Organization\"}</script>" +
            "\"finalPrice\": {\"amount\": 99000}" +
            "</html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p10");
    assertEquals(99000, result.getPrice());
}

@Test
@DisplayName("11. LdJson - JSON array root (phủ nhánh rootNode.isArray)")
void testCrawlLdJsonRootArray() throws Exception {
    // Phủ nhánh rootNode là JsonArray chứa nhiều phần tử
    String html = "<html><script type=\"application/ld+json\">[" +
            "{\"@type\":\"BreadcrumbList\"}," +
            "{\"@type\":\"Product\",\"offers\":{\"price\":120000,\"availability\":\"InStock\"}}" +
            "]</script></html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p11");
    assertEquals(120000, result.getPrice());
    assertTrue(result.getInStock());
}

@Test
@DisplayName("12. LdJson - offers null/missing -> fallback sang MetaTags")
void testCrawlLdJsonNoOffers() throws Exception {
    // Phủ nhánh offersNode == null hoặc missing
    String html = "<html>" +
            "<script type=\"application/ld+json\">{\"@type\":\"Product\"}</script>" +
            "<meta property=\"product:price:amount\" content=\"180000\">" +
            "<meta property=\"product:availability\" content=\"in stock\">" +
            "</html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p12");
    assertEquals(180000, result.getPrice());
    assertTrue(result.getInStock());
}

// ===== BỔ SUNG CHO tryParseMetaTags =====

@Test
@DisplayName("13. MetaTags - availability 'instock' (không space) -> InStock")
void testCrawlMetaTagsInStockNoSpace() throws Exception {
    // Phủ các biến thể chuỗi availability
    String html = "<html>" +
            "<meta property=\"product:price:amount\" content=\"250000\">" +
            "<meta property=\"product:availability\" content=\"instock\">" +
            "</html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p13");
    assertEquals(250000, result.getPrice());
    assertTrue(result.getInStock());
}

@Test
@DisplayName("14. MetaTags - thiếu availability tag -> mặc định InStock=true hoặc false")
void testCrawlMetaTagsMissingAvailability() throws Exception {
    // Phủ nhánh availability tag không tồn tại
    String html = "<html>" +
            "<meta property=\"product:price:amount\" content=\"300000\">" +
            "</html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p14");
    assertEquals(300000, result.getPrice());
    assertNotNull(result.getInStock());
}

@Test
@DisplayName("15. MetaTags - dùng og:price:amount thay vì product:price:amount")
void testCrawlMetaTagsOgPrice() throws Exception {
    // Phủ nhánh meta tag dạng og:
    String html = "<html>" +
            "<meta property=\"og:price:amount\" content=\"450000\">" +
            "<meta property=\"og:availability\" content=\"instock\">" +
            "</html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p15");
    assertNotNull(result);
}

// ===== BỔ SUNG CHO tryParseFinalPrice =====

@Test
@DisplayName("16. FinalPrice - amount là string số (phủ nhánh string parse)")
void testCrawlFinalPriceStringAmount() throws Exception {
    // Phủ trường hợp amount là chuỗi thay vì số
    String html = "<html>\"finalPrice\": {\"amount\": \"750000\"}</html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p16");
    assertEquals(750000, result.getPrice());
}

@Test
@DisplayName("17. FinalPrice - không tìm thấy pattern -> trả null, fallback tiếp")
void testCrawlFinalPriceNoMatch() throws Exception {
    // Phủ nhánh regex không match -> method trả null
    String html = "<html><div data-price=\"600000\"></div></html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p17");
    assertEquals(600000, result.getPrice()); // fallback sang DataPrice
}

// ===== BỔ SUNG CHO tryParseDataPrice =====

@Test
@DisplayName("18. DataPrice - data-price là số có dấu phẩy '350,000'")
void testCrawlDataPriceWithComma() throws Exception {
    // Phủ nhánh parse số có dấu phẩy/chấm
    String html = "<html><div data-price=\"350,000\"></div></html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p18");
    assertNotNull(result);
}

@Test
@DisplayName("19. DataPrice - data-price không có -> không parse được")
void testCrawlDataPriceNotFound() throws Exception {
    // Phủ nhánh không tìm thấy data-price attribute
    // HTML không có bất kỳ strategy nào match -> RuntimeException
    String html = "<html><div class=\"price\"></div></html>";
    setupMock(200, html);

    assertThrows(RuntimeException.class, () -> crawler.crawl("https://guardian.com.vn/p19"));
}

// ===== BỔ SUNG CHO fetchHtml =====

@Test
@DisplayName("20. fetchHtml - IOException khi gửi request -> ném RuntimeException")
void testFetchHtmlIOException() throws Exception {
    // Phủ nhánh catch IOException trong fetchHtml
    reset(mockHttpClient);
    when(mockHttpClient.send(any(), any())).thenThrow(new java.io.IOException("Connection refused"));

    assertThrows(RuntimeException.class, () -> crawler.crawl("https://guardian.com.vn/p20"));
}

@Test
@DisplayName("21. fetchHtml - InterruptedException -> ném RuntimeException và restore interrupt")
void testFetchHtmlInterruptedException() throws Exception {
    // Phủ nhánh catch InterruptedException trong fetchHtml
    reset(mockHttpClient);
    when(mockHttpClient.send(any(), any())).thenThrow(new InterruptedException("Interrupted"));

    assertThrows(RuntimeException.class, () -> crawler.crawl("https://guardian.com.vn/p21"));
}

// ===== BỔ SUNG CHO crawl =====

@Test
@DisplayName("22. crawl - LdJson thành công nhưng price=0 -> vẫn build DTO")
void testCrawlLdJsonPriceZero() throws Exception {
    // Phủ nhánh edge case price = 0
    String html = "<html><script type=\"application/ld+json\">{" +
            "\"@type\":\"Product\"," +
            "\"offers\":{\"price\":0,\"availability\":\"InStock\"}" +
            "}</script></html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p22");
    assertNotNull(result);
}

@Test
@DisplayName("23. crawl - URL hợp lệ, tất cả strategy đều thành công với InStock")
void testCrawlAllStrategiesInStock() throws Exception {
    // Đảm bảo nhánh inStock=true trong crawl() được cover
    String html = "<html><script type=\"application/ld+json\">{" +
            "\"@type\":\"Product\"," +
            "\"offers\":{\"price\":999000,\"availability\":\"https://schema.org/InStock\"}" +
            "}</script></html>";
    setupMock(200, html);

    PriceSnapshotDTO result = crawler.crawl("https://guardian.com.vn/p23");
    assertTrue(result.getInStock());
    assertEquals(999000, result.getPrice());
}

// ===== BỔ SUNG CHO asNullableInt =====

@Test
@DisplayName("24. asNullableInt - Text node chứa số có ký tự thừa '1.500đ'")
void testAsNullableIntTextWithNonDigits() {
    // Phủ nhánh text có số xen lẫn ký tự -> extract digits
    var textNode = objectMapper.valueToTree("1500đ");
    Integer result = ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", textNode);
    assertNotNull(result);
    assertEquals(1500, result);
}

@Test
@DisplayName("25. asNullableInt - null node -> trả null")
void testAsNullableIntNullNode() {
    // Phủ nhánh node là NullNode
    var nullNode = objectMapper.nullNode();
    assertNull(ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", nullNode));
}
}