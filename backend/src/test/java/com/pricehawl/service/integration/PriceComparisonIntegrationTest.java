package com.pricehawl.service.integration;


import com.pricehawl.entity.Platform;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.PlatformRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductRepository;
import com.pricehawl.security.JwtAuthFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
    "spring.main.lazy-initialization=true",
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=none",
    "pricehawk.scheduler.price-refresh.enabled=false"
})
class PriceComparisonIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ProductRepository productRepository;
    @Autowired private ProductListingRepository listingRepository;
    @Autowired private PlatformRepository platformRepository;

    @MockBean private JwtAuthFilter jwtAuthFilter; // Vô hiệu hóa bảo mật để test API public này nhanh hơn

    private UUID productId;
    private Platform tiki;
    private Platform hasaki;

    @BeforeEach
    void setUp() {
        // 1. Tạo Platforms
        tiki = platformRepository.save(Platform.builder().name("Tiki").isActive(true).build());
        hasaki = platformRepository.save(Platform.builder().name("Hasaki").isActive(true).build());

        // 2. Tạo Product với ảnh gốc
        Product product = Product.builder()
                .id(UUID.randomUUID())
                .name("Kem Chống Nắng Anessa")
                .imageUrl("https://img.com/anessa-root.jpg")
                .build();
        productId = productRepository.save(product).getId();
    }

    @Test
    @DisplayName("Test Full Logic: Lọc null, Sắp xếp giá, Gom ảnh không trùng")
    void testCompareByProductId_FullLogic() throws Exception {
        // Listing 1: Giá rẻ (100k) -> Phải đứng đầu
        listingRepository.save(ProductListing.builder()
                .product(Product.builder().id(productId).build())
                .platform(tiki)
                .currentPrice(100000)
                .platformImageUrl("https://img.com/anessa-tiki.jpg")
                .inStock(true).build());

        // Listing 2: Giá đắt (200k) -> Phải đứng sau
        listingRepository.save(ProductListing.builder()
                .product(Product.builder().id(productId).build())
                .platform(hasaki)
                .currentPrice(200000)
                .platformImageUrl("https://img.com/anessa-root.jpg") // Ảnh trùng ảnh gốc để test .distinct()
                .inStock(true).build());

        // Listing 3: KHÔNG CÓ GIÁ -> Phải bị lọc bỏ hoàn toàn (bao phủ nhánh filter null)
        listingRepository.save(ProductListing.builder()
                .product(Product.builder().id(productId).build())
                .platform(tiki)
                .currentPrice(null)
                .build());

        mockMvc.perform(get("/api/compare/" + productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productName").value("Kem Chống Nắng Anessa"))
                // Kiểm tra logic lọc null: Chỉ còn 2 listings hợp lệ
                .andExpect(jsonPath("$.comparisons", hasSize(2)))
                // Kiểm tra logic sắp xếp: 100k đứng trước 200k
                .andExpect(jsonPath("$.comparisons[0].price").value(100000))
                .andExpect(jsonPath("$.comparisons[1].price").value(200000))
                // Kiểm tra logic gom ảnh distinct: 1 ảnh gốc + 1 ảnh tiki (ảnh hasaki trùng nên bị loại)
                .andExpect(jsonPath("$.imageUrls", hasSize(2)));
    }

    @Test
    @DisplayName("Test Edge Case: Sản phẩm không tồn tại")
    void testCompareByProductId_NotFound() throws Exception {
        mockMvc.perform(get("/api/compare/" + UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Test Edge Case: Sản phẩm không có Listing nào")
    void testCompareByProductId_NoListings() throws Exception {
        mockMvc.perform(get("/api/compare/" + productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comparisons", hasSize(0)))
                .andExpect(jsonPath("$.imageUrls", hasSize(1))); // Chỉ có ảnh gốc của Product
    }
}