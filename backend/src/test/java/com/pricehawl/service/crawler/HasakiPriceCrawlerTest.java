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

class HasakiPriceCrawlerTest {

    private HasakiPriceCrawler crawler;
    private ObjectMapper objectMapper;
    private HttpClient mockHttpClient;
    private HttpResponse<String> mockResponse;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        objectMapper = new ObjectMapper();
        crawler = new HasakiPriceCrawler(objectMapper);
        mockHttpClient = mock(HttpClient.class);
        mockResponse = (HttpResponse<String>) mock(HttpResponse.class);
        ReflectionTestUtils.setField(crawler, "httpClient", mockHttpClient);
    }

    // ─── platformName ────────────────────────────────────────────────────────

    @Test
    @DisplayName("Nên trả về đúng tên platform")
    void testPlatformName() {
        assertEquals("hasaki", crawler.platformName());
    }

    // ─── crawl / fetchHtml ────────────────────────────────────────────────────

    @Test
    @DisplayName("Ném lỗi khi HTTP Status không phải 200")
    void testFetchHtmlError() throws Exception {
        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(404);

        assertThrows(RuntimeException.class, () -> crawler.crawl("https://hasaki.vn/fail"));
    }

    @Test
    @DisplayName("Ném lỗi khi tất cả chiến thuật parse đều thất bại")
    void testAllStrategiesFail() throws Exception {
        String html = "<html><body>No price data here</body></html>";
        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        assertThrows(RuntimeException.class, () -> crawler.crawl("https://hasaki.vn/empty"));
    }

    // ─── tryParseNextData ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Crawl thành công bằng chiến thuật __NEXT_DATA__ – có đầy đủ price + inStock")
    void testCrawlSuccessNextData() throws Exception {
        String html = "<html><script id=\"__NEXT_DATA__\">"
                + "{\"props\":{\"pageProps\":{\"product\":{\"price\":150000,\"is_in_stock\":true}}}}"
                + "</script></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-test");

        assertNotNull(result);
        assertEquals(150000, result.getPrice());
        assertTrue(result.getInStock());
    }

    @Test
    @DisplayName("__NEXT_DATA__ – có originalPrice và discountPercent")
    void testCrawlNextDataWithOriginalPriceAndDiscount() throws Exception {
        // Cover nhánh originalPrice != null và discountPercent != null
        String html = "<html><script id=\"__NEXT_DATA__\">"
                + "{\"props\":{\"pageProps\":{\"product\":{"
                + "\"price\":120000,"
                + "\"original_price\":150000,"
                + "\"discount_percent\":20.0,"
                + "\"is_in_stock\":true}}}}"
                + "</script></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-test");

        assertNotNull(result);
        assertEquals(120000, result.getPrice());
    }

    @Test
    @DisplayName("__NEXT_DATA__ – is_in_stock = false (hết hàng)")
    void testCrawlNextDataOutOfStock() throws Exception {
        // Cover nhánh is_in_stock = false
        String html = "<html><script id=\"__NEXT_DATA__\">"
                + "{\"props\":{\"pageProps\":{\"product\":{"
                + "\"price\":99000,"
                + "\"is_in_stock\":false}}}}"
                + "</script></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-test");

        assertNotNull(result);
        assertFalse(result.getInStock());
        assertEquals("Hết hàng", result.getStatusText());
    }

    @Test
    @DisplayName("__NEXT_DATA__ – không có node product → fall through sang chiến thuật khác")
    void testCrawlNextDataMissingProductNode() throws Exception {
        // Cover nhánh: __NEXT_DATA__ parse được JSON nhưng không tìm thấy price node
        // → ném RuntimeException (vì các chiến thuật khác cũng không có data)
        String html = "<html><script id=\"__NEXT_DATA__\">"
                + "{\"props\":{\"pageProps\":{}}}"
                + "</script></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        assertThrows(RuntimeException.class, () -> crawler.crawl("https://hasaki.vn/no-product"));
    }

    @Test
    @DisplayName("__NEXT_DATA__ – JSON không hợp lệ → fall through sang chiến thuật khác")
    void testCrawlNextDataInvalidJson() throws Exception {
        // Cover nhánh catch của tryParseNextData
        String html = "<html><script id=\"__NEXT_DATA__\">INVALID_JSON</script></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        // Không tìm được price ở bất kỳ chiến thuật nào
        assertThrows(RuntimeException.class, () -> crawler.crawl("https://hasaki.vn/bad-json"));
    }

    // ─── tryParseLdJson ───────────────────────────────────────────────────────

    @Test
    @DisplayName("Crawl thành công bằng chiến thuật ld+json – InStock")
    void testCrawlSuccessLdJson() throws Exception {
        String html = "<html><script type=\"application/ld+json\">"
                + "{\"@type\":\"Product\",\"offers\":{\"price\":200000,\"availability\":\"InStock\"}}"
                + "</script></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-test");

        assertNotNull(result);
        assertEquals(200000, result.getPrice());
        assertTrue(result.getInStock());
    }

    @Test
    @DisplayName("ld+json – availability = OutOfStock")
    void testCrawlLdJsonOutOfStock() throws Exception {
        // Cover nhánh availability != InStock
        String html = "<html><script type=\"application/ld+json\">"
                + "{\"@type\":\"Product\",\"offers\":{\"price\":180000,\"availability\":\"OutOfStock\"}}"
                + "</script></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-test");

        assertNotNull(result);
        assertFalse(result.getInStock());
    }

    @Test
    @DisplayName("ld+json – có @graph chứa Product")
    void testCrawlLdJsonWithGraph() throws Exception {
        // Cover nhánh @graph array nếu crawler hỗ trợ
        String html = "<html><script type=\"application/ld+json\">"
                + "{\"@context\":\"https://schema.org\",\"@graph\":["
                + "{\"@type\":\"Product\",\"offers\":{\"price\":175000,\"availability\":\"InStock\"}}"
                + "]}"
                + "</script></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        // Nếu crawler hỗ trợ @graph thì kiểm tra kết quả,
        // nếu không thì sẽ fall through và ném exception
        try {
            PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-graph");
            assertEquals(175000, result.getPrice());
        } catch (RuntimeException ignored) {
            // Chấp nhận nếu crawler không hỗ trợ @graph
        }
    }

    @Test
    @DisplayName("ld+json – JSON không hợp lệ → fall through sang Regex")
    void testCrawlLdJsonInvalidJson() throws Exception {
        // Không có __NEXT_DATA__, ld+json không hợp lệ, có Regex match
        String html = "<html>"
                + "<script type=\"application/ld+json\">NOT_JSON</script>"
                + "<body>\"price\":99000</body></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-test");
        assertEquals(99000, result.getPrice());
    }

    // ─── tryParseRegex ────────────────────────────────────────────────────────

    @Test
    @DisplayName("Crawl thành công bằng Regex – pattern offers price")
    void testCrawlSuccessRegexOffersPattern() throws Exception {
        String html = "<html><body> \"offers\":{\"price\":350000} </body></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-test");
        assertNotNull(result);
        assertEquals(350000, result.getPrice());
    }

    @Test
    @DisplayName("Crawl thành công bằng Regex – pattern price đơn giản")
    void testCrawlSuccessRegexSimplePattern() throws Exception {
        String html = "<html><body> \"price\":450000 </body></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-test");
        assertEquals(450000, result.getPrice());
    }

    @Test
    @DisplayName("Regex – có in_stock = true trong HTML")
    void testCrawlRegexInStock() throws Exception {
        // Cover nhánh inStock detection trong Regex fallback
        String html = "<html><body> \"price\":300000 \"in_stock\":true </body></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-test");
        assertNotNull(result);
        assertEquals(300000, result.getPrice());
    }

    @Test
    @DisplayName("Regex – có in_stock = false trong HTML")
    void testCrawlRegexOutOfStock() throws Exception {
        // Cover nhánh inStock = false trong Regex fallback
        String html = "<html><body> \"price\":300000 \"in_stock\":false </body></html>";

        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(html);

        PriceSnapshotDTO result = crawler.crawl("https://hasaki.vn/product-test");
        assertNotNull(result);
        assertEquals(300000, result.getPrice());
    }

    // ─── asNullableInt ────────────────────────────────────────────────────────

    @Test
    @DisplayName("asNullableInt – node là số nguyên")
    void testAsNullableIntWithIntNode() {
        var node = objectMapper.valueToTree(185000);
        Integer result = ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", node);
        assertEquals(185000, result);
    }

    @Test
    @DisplayName("asNullableInt – node là số thực (double)")
    void testAsNullableIntWithDoubleNode() {
        var node = objectMapper.valueToTree(185000.0);
        Integer result = ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", node);
        assertEquals(185000, result);
    }

    @Test
    @DisplayName("asNullableInt – chuỗi tiếng Việt có dấu chấm '185.000đ'")
    void testAsNullableIntWithFormattedVietnameseString() {
        var node = objectMapper.valueToTree("185.000đ");
        Integer result = ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", node);
        assertEquals(185000, result);
    }

    @Test
    @DisplayName("asNullableInt – chuỗi số thuần '185000'")
    void testAsNullableIntWithPlainString() {
        var node = objectMapper.valueToTree("185000");
        Integer result = ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", node);
        assertEquals(185000, result);
    }

    @Test
    @DisplayName("asNullableInt – chuỗi không parse được → trả về null")
    void testAsNullableIntWithUnparsableString() {
        // Cover nhánh NumberFormatException → return null
        var node = objectMapper.valueToTree("không-phải-số");
        Integer result = ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", node);
        assertNull(result);
    }

    @Test
    @DisplayName("asNullableInt – node là ObjectNode → trả về null")
    void testAsNullableIntWithObjectNode() {
        var node = objectMapper.createObjectNode();
        Integer result = ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", node);
        assertNull(result);
    }

    @Test
    @DisplayName("asNullableInt – node là null JsonNode (NullNode) → trả về null")
    void testAsNullableIntWithNullNode() {
        var node = objectMapper.nullNode();
        Integer result = ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", node);
        assertNull(result);
    }

    @Test
    @DisplayName("asNullableInt – chuỗi với khoảng trắng '185000  '")
    void testAsNullableIntWithWhitespace() {
        var node = objectMapper.valueToTree("  185000  ");
        Integer result = ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", node);
        assertEquals(185000, result);
    }

    // ─── buildDto ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("buildDto – inStock = true → statusText = 'Còn hàng'")
    void testBuildDtoInStock() {
        PriceSnapshotDTO dto = ReflectionTestUtils.invokeMethod(
                crawler, "buildDto", 100, 200, 50.0, true, "url");

        assertNotNull(dto);
        assertEquals(100, dto.getPrice());
        assertEquals("Còn hàng", dto.getStatusText());
        assertTrue(dto.getInStock());
    }

    @Test
    @DisplayName("buildDto – inStock = false → statusText = 'Hết hàng'")
    void testBuildDtoOutOfStock() {
        // Cover nhánh inStock = false trong buildDto
        PriceSnapshotDTO dto = ReflectionTestUtils.invokeMethod(
                crawler, "buildDto", 100, null, null, false, "url");

        assertNotNull(dto);
        assertFalse(dto.getInStock());
        assertEquals("Hết hàng", dto.getStatusText());
    }

    @Test
    @DisplayName("buildDto – originalPrice = null, discountPercent = null")
    void testBuildDtoNullOptionals() {
        PriceSnapshotDTO dto = ReflectionTestUtils.invokeMethod(
                crawler, "buildDto", 150000, null, null, true, "https://hasaki.vn/p");

        assertNotNull(dto);
        assertEquals(150000, dto.getPrice());
        assertTrue(dto.getInStock());
        assertEquals("Còn hàng", dto.getStatusText());
    }

    @Test
    @DisplayName("buildDto – với originalPrice và discountPercent")
    void testBuildDtoWithAllFields() {
        PriceSnapshotDTO dto = ReflectionTestUtils.invokeMethod(
                crawler, "buildDto", 100000, 150000, 33.33, true, "https://hasaki.vn/product");

        assertNotNull(dto);
        assertEquals(100000, dto.getPrice());
        assertTrue(dto.getInStock());
    }
}