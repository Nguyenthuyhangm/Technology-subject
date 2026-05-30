package com.pricehawl.service;

import com.pricehawl.dto.PriceComparisonResponse;
import com.pricehawl.entity.Platform;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
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

    @Mock private ProductRepository productRepository;
    @Mock private ProductListingRepository productListingRepository;
    @Mock private PriceRecordRepository priceRecordRepository;

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
        platform = Platform.builder().id(1).name("Tiki").isActive(true).build();
    }

    private ProductListing listing(String status, String platformImageUrl) {
        return ProductListing.builder()
                .id(UUID.randomUUID())
                .product(product)
                .platform(platform)
                .platformName("Tiki")
                .url("https://tiki.vn/product")
                .platformImageUrl(platformImageUrl)
                .status(status)
                .build();
    }

    private PriceRecord priceRecord(int price) {
        return PriceRecord.builder()
                .price(price)
                .originalPrice(120_000)
                .discountPct(20f)
                .inStock(true)
                .crawledAt(LocalDateTime.now())
                .build();
    }

    // ── product not found → exception ────────────────────────────────────────

    @Test
    void compareByProductId_productNotFound_throwsResourceNotFound() {
        when(productRepository.findById(productId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.compareByProductId(productId));
    }

    // ── listing hidden bị lọc ra ──────────────────────────────────────────────

    @Test
    void compareByProductId_hiddenListingFiltered_notInResult() {
        ProductListing hidden = listing("hidden", null);
        ProductListing active = listing("active", "https://img.tiki.vn/img.jpg");

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productListingRepository.findByProductId(productId)).thenReturn(List.of(hidden, active));
        when(priceRecordRepository.findTopByProductListingIdOrderByCrawledAtDesc(active.getId()))
                .thenReturn(Optional.of(priceRecord(100_000)));

        PriceComparisonResponse response = service.compareByProductId(productId);
        assertEquals(1, response.getComparisons().size());
    }

    // ── listing không có giá bị bỏ qua ───────────────────────────────────────

    @Test
    void compareByProductId_listingWithNoPrice_excluded() {
        ProductListing l = listing("active", null);

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productListingRepository.findByProductId(productId)).thenReturn(List.of(l));
        when(priceRecordRepository.findTopByProductListingIdOrderByCrawledAtDesc(l.getId()))
                .thenReturn(Optional.empty());

        PriceComparisonResponse response = service.compareByProductId(productId);
        assertTrue(response.getComparisons().isEmpty());
    }

    // ── sort theo giá tăng dần ────────────────────────────────────────────────

    @Test
    void compareByProductId_sortedByPriceAscending() {
        ProductListing l1 = listing("active", null);
        ProductListing l2 = listing("active", null);

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productListingRepository.findByProductId(productId)).thenReturn(List.of(l1, l2));
        when(priceRecordRepository.findTopByProductListingIdOrderByCrawledAtDesc(l1.getId()))
                .thenReturn(Optional.of(priceRecord(150_000)));
        when(priceRecordRepository.findTopByProductListingIdOrderByCrawledAtDesc(l2.getId()))
                .thenReturn(Optional.of(priceRecord(90_000)));

        PriceComparisonResponse response = service.compareByProductId(productId);
        assertEquals(2, response.getComparisons().size());
        assertEquals(90_000, response.getComparisons().get(0).getPrice());
        assertEquals(150_000, response.getComparisons().get(1).getPrice());
    }

    // ── imageUrls gom đúng: product image + platform images ──────────────────

    @Test
    void compareByProductId_imageUrlsAggregated() {
        ProductListing l = listing("active", "https://img.tiki.vn/img.jpg");

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productListingRepository.findByProductId(productId)).thenReturn(List.of(l));
        when(priceRecordRepository.findTopByProductListingIdOrderByCrawledAtDesc(l.getId()))
                .thenReturn(Optional.of(priceRecord(100_000)));

        PriceComparisonResponse response = service.compareByProductId(productId);
        // product image + platform image = 2
        assertEquals(2, response.getImageUrls().size());
        assertTrue(response.getImageUrls().contains("https://img.example.com/product.jpg"));
        assertTrue(response.getImageUrls().contains("https://img.tiki.vn/img.jpg"));
    }

    // ── product không có imageUrl → chỉ có platform image ────────────────────

    @Test
    void compareByProductId_noProductImage_onlyPlatformImages() {
        product = Product.builder().id(productId).name("Kem").imageUrl(null).build();
        ProductListing l = listing("active", "https://img.tiki.vn/img.jpg");

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productListingRepository.findByProductId(productId)).thenReturn(List.of(l));
        when(priceRecordRepository.findTopByProductListingIdOrderByCrawledAtDesc(l.getId()))
                .thenReturn(Optional.of(priceRecord(100_000)));

        PriceComparisonResponse response = service.compareByProductId(productId);
        assertEquals(1, response.getImageUrls().size());
    }
}
