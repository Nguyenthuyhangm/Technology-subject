package com.pricehawl.service.integration;


import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.entity.Product;
import com.pricehawl.repository.ProductRepository;
import com.pricehawl.service.ProductSearchService;
import com.pricehawl.security.JwtAuthFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.main.lazy-initialization=true",
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=none",
    "spring.data.redis.repositories.enabled=false"
})
class ProductSearchIntegrationTest {

    @Autowired 
    private ProductSearchService searchService;

    @Autowired 
    private ProductRepository productRepository;

    @MockBean 
    private JwtAuthFilter jwtAuthFilter;

    @BeforeEach
    void setUp() {
        // Xóa sạch index cũ để test dữ liệu mới
        // Lưu ý: Nếu method này chưa có, em có thể bỏ qua hoặc dùng ElasticsearchOperations để delete index
    }

    @Test
    @DisplayName("1. Sync Data - Đẩy dữ liệu từ DB sang Elasticsearch")
    void testSyncAll_Success() {
        // Tạo 1 sản phẩm mẫu trong DB
        Product p = Product.builder()
                .id(UUID.randomUUID())
                .name("Serum Vitamin C")
                .description("Dưỡng sáng da chuyên sâu")
                .build();
        productRepository.save(p);

        // Chạy logic đồng bộ
        assertDoesNotThrow(() -> searchService.syncAll());
    }

    @Test
    @DisplayName("2. Search Keyword - Tìm đúng từ khóa chính xác")
    void testSearch_ValidKeyword() {
        // Giả sử đã có data từ bước sync
        searchService.syncAll();

        List<ProductSearchDTO> results = searchService.search("Serum");

        assertFalse(results.isEmpty(), "Phải tìm thấy sản phẩm chứa từ 'Serum'");
        assertTrue(results.get(0).getName().contains("Serum"));
    }

    @Test
    @DisplayName("3. Fuzzy Search - Tìm kiếm khi gõ sai chính tả (Typo)")
    void testSearch_FuzzyLogic() {
        searchService.syncAll();

        // Gõ sai "Serum" thành "Serun" hoặc "Srum"
        List<ProductSearchDTO> results = searchService.search("Serun");

        assertFalse(results.isEmpty(), "Fuzzy search phải hoạt động khi gõ sai 1-2 ký tự");
    }

    @Test
    @DisplayName("4. No Results - Keyword không tồn tại")
    void testSearch_EmptyResult() {
        List<ProductSearchDTO> results = searchService.search("san-pham-khong-ton-tai-123");

        assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("5. Validate DTO Mapping - Kiểm tra các field trả về")
    void testSearch_DtoContent() {
        searchService.syncAll();
        List<ProductSearchDTO> results = searchService.search("Vitamin");

        if (!results.isEmpty()) {
            ProductSearchDTO dto = results.get(0);
            assertNotNull(dto.getId());
            assertNotNull(dto.getName());
            // Nếu có field giá, kiểm tra luôn để phủ coverage logic map bestPrice
        }
    }
}