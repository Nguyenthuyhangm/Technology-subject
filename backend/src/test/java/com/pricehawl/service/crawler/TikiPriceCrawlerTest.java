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

class TikiPriceCrawlerTest {

    private TikiPriceCrawler crawler;
    private ObjectMapper objectMapper;
    private HttpClient mockHttpClient;
    private HttpResponse<String> mockResponse;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        objectMapper = new ObjectMapper();
        crawler = new TikiPriceCrawler(objectMapper);
        mockHttpClient = mock(HttpClient.class);
        mockResponse = (HttpResponse<String>) mock(HttpResponse.class);
        ReflectionTestUtils.setField(crawler, "httpClient", mockHttpClient);
    }

    @Test
    @DisplayName("Nên trả về đúng tên platform tiki")
    void testPlatformName() {
        assertEquals("tiki", crawler.platformName());
    }

    @Test
    @DisplayName("Crawl thành công - Phủ nhánh Stock và Discount")
    void testCrawlSuccessFull() throws Exception {
        String productUrl = "https://tiki.vn/p12345.html";
        // Case này phủ: statusCode 200, originalPrice > price (có discount), qty > 0 (inStock)
        String json = "{" +
                "\"price\": 1000," +
                "\"original_price\": 2000," +
                "\"stock_item\": {\"qty\": 5}," +
                "\"inventory_status\": \"available\"" +
                "}";

        setupMock(200, json);

        PriceSnapshotDTO result = crawler.crawl(productUrl);
        assertNotNull(result);
        assertTrue(result.getInStock());
        assertEquals(50.0, result.getDiscountPct());
    }

    @Test
    @DisplayName("Crawl nhánh Hết hàng - Phủ nhánh qty = 0")
    void testCrawlOutOfStock() throws Exception {
        String productUrl = "https://tiki.vn/p12345.html";
        // Case này phủ: qty = 0 hoặc status khác available
        String json = "{" +
                "\"price\": 1000," +
                "\"original_price\": 1000," +
                "\"stock_item\": {\"qty\": 0}," +
                "\"inventory_status\": \"out_of_stock\"" +
                "}";

        setupMock(200, json);

        PriceSnapshotDTO result = crawler.crawl(productUrl);
        assertFalse(result.getInStock());
        assertEquals("Hết hàng", result.getStatusText());
    }

    @Test
    @DisplayName("Ném lỗi khi HTTP Status khác 200 - Phủ nhánh check Status")
    void testCrawlHttpError() throws Exception {
        setupMock(404, "Not Found");
        assertThrows(RuntimeException.class, () -> crawler.crawl("https://tiki.vn/p123.html"));
    }

    @Test
    @DisplayName("Ném lỗi khi URL không hợp lệ")
    void testExtractProductIdInvalid() {
        assertThrows(IllegalArgumentException.class, () -> crawler.crawl("https://tiki.vn/invalid"));
    }

    @Test
    @DisplayName("Vét sạch asNullableInt - Phủ nhánh true/false isNumber")
    void testAsNullableIntExhaustive() throws Exception {
        // Nhánh null
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", (Object) null));
        
        // Nhánh isNumber = true
        var nodeNum = objectMapper.readTree("100");
        assertEquals(100, (Integer) ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", nodeNum));

        // Nhánh NOT a number (Ví dụ TextNode) -> Phủ nhánh false của isNumber()
        var nodeText = objectMapper.readTree("\"100\"");
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", nodeText));
    }

    @Test
    @DisplayName("Vét sạch extractProductId - Phủ nhánh null và Regex")
    void testExtractProductIdLogic() {
        // Nhánh url == null
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "extractProductId", (Object) null));
        // Nhánh match Regex
        assertEquals("123", ReflectionTestUtils.invokeMethod(crawler, "extractProductId", "https://tiki.vn/p123.html"));
        // Nhánh không match Regex
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "extractProductId", "https://tiki.vn/home"));
    }

    private void setupMock(int status, String body) throws Exception {
        when(mockResponse.statusCode()).thenReturn(status);
        when(mockResponse.body()).thenReturn(body);
        doReturn(mockResponse).when(mockHttpClient).send(any(), any());
    }
}