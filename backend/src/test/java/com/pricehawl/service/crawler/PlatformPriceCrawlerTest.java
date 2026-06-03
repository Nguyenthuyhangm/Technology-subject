package com.pricehawl.service.crawler;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PlatformPriceCrawlerTest {

    @Test
    @DisplayName("Kiểm tra tính kế thừa của các Crawler")
    void testCrawlerImplementation() {
        ObjectMapper mapper = new ObjectMapper();
        
        // Tạo các đối tượng crawler thực tế
        TikiPriceCrawler tiki = new TikiPriceCrawler(mapper);
        HasakiPriceCrawler hasaki = new HasakiPriceCrawler(mapper);
        CocoluxPriceCrawler cocolux = new CocoluxPriceCrawler(mapper);
        
        // Kiểm tra xem chúng có phải là instance của Interface không
        assertTrue(tiki instanceof PlatformPriceCrawler);
        assertTrue(hasaki instanceof PlatformPriceCrawler);
        assertTrue(cocolux instanceof PlatformPriceCrawler);
    }
}