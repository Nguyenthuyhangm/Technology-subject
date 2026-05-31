package com.pricehawl.service;

import com.pricehawl.dto.PriceComparisonResponse;
import com.pricehawl.entity.Platform;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PriceComparisonServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductListingRepository productListingRepository;

    @InjectMocks
    private PriceComparisonServiceImpl service;

    private UUID productId;
    private Product product;
    private Platform platform;

    @BeforeEach
    void setUp() {
        productId = UUID.randomUUID();
        product = Product.builder()
                .id(productId)
                .name("Kem dưỡng da")
                .imageUrl("https://img.example.com/product.jpg")
                .build();

        platform = Platform.builder()
                .id(1)
                .name("Tiki")
                .build();
    }

    @Test
    @DisplayName("Product không tồn tại -> Ném ResourceNotFoundException")
    void compareByProductId_NotFound() {
        when(productRepository.findById(productId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.compareByProductId(productId));
    }

    @Test
    @DisplayName("Product không có listing nào -> Trả về response rỗng nhưng không lỗi")
    void compareByProductId_NoListings() {
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productListingRepository.findByProductIdWithPlatform(productId)).thenReturn(List.of());

        PriceComparisonResponse response = service.compareByProductId(productId);

        assertNotNull(response);
        assertTrue(response.getComparisons().isEmpty());
        assertEquals(product.getName(), response.getProductName());
    }

    @Test
    @DisplayName("Sắp xếp giá tăng dần và gom ảnh chính xác")
    void compareByProductId_Success() {
        // Given: Tạo 2 listing (1 cái 200k, 1 cái 100k)
        ProductListing l1 = ProductListing.builder()
                .id(UUID.randomUUID())
                .platform(platform)
                .currentPrice(200000)
                .platformImageUrl("https://tiki.vn/img1.jpg")
                .crawlTime(LocalDateTime.now())
                .build();

        ProductListing l2 = ProductListing.builder()
                .id(UUID.randomUUID())
                .platform(platform)
                .currentPrice(100000)
                .platformImageUrl("https://tiki.vn/img2.jpg")
                .crawlTime(LocalDateTime.now())
                .build();

        // Listing thứ 3 không có giá -> sẽ bị null filter trong code của em
        ProductListing l3 = ProductListing.builder()
                .currentPrice(null)
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productListingRepository.findByProductIdWithPlatform(productId))
                .thenReturn(List.of(l1, l2, l3));

        // When
        PriceComparisonResponse response = service.compareByProductId(productId);

        // Then
        assertNotNull(response);
        // Kiểm tra logic lọc null: Chỉ còn 2 listing có giá
        assertEquals(2, response.getComparisons().size());
        
        // Kiểm tra logic sắp xếp: 100k phải đứng trước 200k
        assertEquals(100000, response.getComparisons().get(0).getPrice());
        assertEquals(200000, response.getComparisons().get(1).getPrice());

        // Kiểm tra logic gom ảnh (1 ảnh product + 2 ảnh platform = 3 ảnh)
        assertEquals(3, response.getImageUrls().size());
        assertTrue(response.getImageUrls().contains("https://img.example.com/product.jpg"));
    }

    @Test
    @DisplayName("Kiểm tra ảnh không trùng lặp (distinct)")
    void compareByProductId_DistinctImages() {
        // Given: Listing có ảnh trùng với ảnh của Product
        ProductListing l = ProductListing.builder()
                .id(UUID.randomUUID())
                .platform(platform)
                .currentPrice(100000)
                .platformImageUrl("https://img.example.com/product.jpg") // Trùng ảnh product
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productListingRepository.findByProductIdWithPlatform(productId)).thenReturn(List.of(l));

        // When
        PriceComparisonResponse response = service.compareByProductId(productId);

        // Then: Stream().distinct() phải làm gọn lại còn 1 ảnh
        assertEquals(1, response.getImageUrls().size());
    }
}