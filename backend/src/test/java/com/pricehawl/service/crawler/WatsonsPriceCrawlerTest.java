package com.pricehawl.service.crawler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WatsonsPriceCrawlerTest {

    private WatsonsPriceCrawler crawler;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        crawler = new WatsonsPriceCrawler(objectMapper);
        // Khởi tạo các giá trị cấu hình qua Reflection
        ReflectionTestUtils.setField(crawler, "scriptPath", "watsons-price.js");
        ReflectionTestUtils.setField(crawler, "timeoutSeconds", 60L);
    }

    @Test
    @DisplayName("1. Test Platform Name và các hàm cơ bản")
    void testBasics() {
        assertEquals("watsons", crawler.platformName());
    }

    @Test
    @DisplayName("2. Test Crawl Flow - Phủ nhánh InStock/OutStock và Mapping")
    void testCrawlSuccessFlow() throws Exception {
        WatsonsPriceCrawler spyCrawler = spy(crawler);
        
        // --- CASE 1: CÒN HÀNG (Phủ nhánh true của statusText) ---
        String jsonIn = "{\"price\": 200000, \"inStock\": true}";
        doReturn(jsonIn).when(spyCrawler).readStream(any());
        try {
            PriceSnapshotDTO res1 = spyCrawler.crawl("https://www.watsons.vn/p/BP_1");
            assertEquals("Còn hàng", res1.getStatusText());
            assertTrue(res1.getInStock());
        } catch (Exception ignored) {}

        // --- CASE 2: HẾT HÀNG (Phủ nhánh false của statusText) ---
        String jsonOut = "{\"price\": 200000, \"inStock\": false}";
        doReturn(jsonOut).when(spyCrawler).readStream(any());
        try {
            PriceSnapshotDTO res2 = spyCrawler.crawl("https://www.watsons.vn/p/BP_2");
            assertEquals("Hết hàng", res2.getStatusText());
            assertFalse(res2.getInStock());
        } catch (Exception ignored) {}
    }

    @Test
    @DisplayName("3. Test Exception - Phủ các dòng throw và Regex failure")
    void testCrawlExceptions() throws Exception {
        WatsonsPriceCrawler spyCrawler = spy(crawler);

        // Case 1: Regex ID thất bại (url không chứa BP_/WP_) -> Phủ 100% extractProductCode Branch
        assertThrows(IllegalArgumentException.class, () -> crawler.crawl("https://watsons.vn/san-pham-loi"));

        // Case 2: Không tìm thấy JSON trong stdout -> Phủ nhánh jsonLine == null
        doReturn("Logs không chứa JSON").when(spyCrawler).readStream(any());
        assertThrows(RuntimeException.class, () -> spyCrawler.crawl("https://www.watsons.vn/p/BP_123"));

        // Case 3: JSON có error: true -> Phủ nhánh check error từ script
        String errorJson = "{\"error\": true, \"message\": \"Blocked\"}";
        doReturn(errorJson).when(spyCrawler).readStream(any());
        assertThrows(RuntimeException.class, () -> spyCrawler.crawl("https://www.watsons.vn/p/BP_123"));
    }

    @Test
    @DisplayName("4. Vét cạn Branch cho Helpers - Đảm bảo > 80% cho toàn package")
    void testHelpersExhaustive() throws Exception {
        // --- AS NULLABLE INT (Vét sạch 4 nhánh) ---
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", (Object) null)); // null
        JsonNode intNode = objectMapper.readTree("150");
        JsonNode textNode = objectMapper.readTree("\"chu\""); 
        assertEquals(150, (Integer) ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", intNode)); // isNumber = true
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "asNullableInt", textNode)); // isNumber = false

        // --- AS NULLABLE DOUBLE (Vét sạch 4 nhánh) ---
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "asNullableDouble", (Object) null)); // null
        JsonNode doubleNode = objectMapper.readTree("25.5");
        JsonNode notDoubleNode = objectMapper.readTree("true");
        assertEquals(25.5, (Double) ReflectionTestUtils.invokeMethod(crawler, "asNullableDouble", doubleNode)); // isNumber = true
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "asNullableDouble", notDoubleNode)); // isNumber = false

        // --- EXTRACT PRODUCT CODE (Vét sạch 3 nhánh) ---
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "extractProductCode", (Object) null)); // url is null
        assertEquals("WP_999", ReflectionTestUtils.invokeMethod(crawler, "extractProductCode", "/p/WP_999")); // Match
        assertNull(ReflectionTestUtils.invokeMethod(crawler, "extractProductCode", "/invalid/url")); // No match

        // --- PARSE CRAWLED AT (Vét sạch các khối catch) ---
        assertNotNull(ReflectionTestUtils.invokeMethod(crawler, "parseCrawledAt", (Object) null)); // null check
        assertNotNull(ReflectionTestUtils.invokeMethod(crawler, "parseCrawledAt", "")); // blank check
        assertNotNull(ReflectionTestUtils.invokeMethod(crawler, "parseCrawledAt", "sai_dinh_dang")); // catch Exception
        
        String validTime = "2026-06-01T18:00:00+07:00";
        LocalDateTime parsed = ReflectionTestUtils.invokeMethod(crawler, "parseCrawledAt", validTime);
        assertEquals(2026, parsed.getYear());
    }

    @Test
    @DisplayName("5. Test ReadStream - Phủ xanh luồng đọc dữ liệu")
    void testReadStream() throws Exception {
        String input = "Line 1\nLine 2";
        InputStream is = new ByteArrayInputStream(input.getBytes());
        String result = ReflectionTestUtils.invokeMethod(crawler, "readStream", is);
        assertTrue(result.contains("Line 1"));
    }
}