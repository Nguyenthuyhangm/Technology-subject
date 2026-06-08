package com.pricehawl.service;

import com.pricehawl.document.ProductDocument;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.entity.Brand;
import com.pricehawl.entity.Category;
import com.pricehawl.entity.Product;
import com.pricehawl.mapper.ProductDocumentMapper;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductRepository;
import com.pricehawl.repository.ProductSearchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;
import org.springframework.data.elasticsearch.core.query.UpdateQuery;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductSearchServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductSearchRepository searchRepository;

    @Mock
    private ProductListingRepository listingRepository;

    @Mock
    private ProductDocumentMapper documentMapper;

    @Mock
    private ElasticsearchOperations elasticsearchOperations;

    @InjectMocks
    private ProductSearchService service;

    private UUID productId;
    private Product product;
    private ProductDocument document;

    @BeforeEach
    void setUp() {

        productId = UUID.randomUUID();

        Category category = new Category();
        category.setName("Skincare");

        Brand brand = new Brand();
        brand.setName("La Roche Posay");

        product = Product.builder()
                .id(productId)
                .name("Cicaplast B5")
                .imageUrl("img.jpg")
                .category(category)
                .brand(brand)
                .build();

        document = ProductDocument.builder()
                .id(productId.toString())
                .name("Cicaplast B5")
                .brandName("La Roche Posay")
                .categoryName("Skincare")
                .imageUrl("img.jpg")
                .bestPrice(250000)
                .bestPlatform("Tiki")
                .build();
    }

    // =====================================================
    // syncAll
    // =====================================================

    @Test
    void syncAll_shouldDeleteAndSaveDocuments() {

        when(productRepository.findAll())
                .thenReturn(List.of(product));

        when(documentMapper.toDocument(product))
                .thenReturn(document);

        service.syncAll();

        verify(searchRepository).deleteAll();
        verify(searchRepository).saveAll(any());
    }

    // =====================================================
    // search
    // =====================================================

    @Test
    void search_foundDocuments_returnsDtos() {

        when(searchRepository.search("b5"))
                .thenReturn(List.of(document));

        List<ProductSearchDTO> result =
                service.search("b5");

        assertEquals(1, result.size());

        ProductSearchDTO dto = result.get(0);

        assertEquals("Cicaplast B5", dto.getName());
        assertEquals("La Roche Posay", dto.getBrandName());
        assertEquals(250000, dto.getBestPrice());
    }

    @Test
    void search_noDocument_returnsEmptyList() {

        when(searchRepository.search("abcxyz"))
                .thenReturn(List.of());

        List<ProductSearchDTO> result =
                service.search("abcxyz");

        assertTrue(result.isEmpty());
    }

    // =====================================================
    // searchFallback
    // =====================================================

    @Test
    void searchFallback_foundProducts_returnsDtos() {

        when(productRepository.findByNameContainingIgnoreCase("b5"))
                .thenReturn(List.of(product));

        List<ProductSearchDTO> result =
                service.searchFallback("b5");

        assertEquals(1, result.size());

        ProductSearchDTO dto = result.get(0);

        assertEquals(productId, dto.getId());
        assertEquals("Cicaplast B5", dto.getName());
        assertEquals("Skincare", dto.getCategoryName());
        assertEquals("La Roche Posay", dto.getBrandName());
    }

    @Test
    void searchFallback_noProduct_returnsEmptyList() {

        when(productRepository.findByNameContainingIgnoreCase("abc"))
                .thenReturn(List.of());

        List<ProductSearchDTO> result =
                service.searchFallback("abc");

        assertTrue(result.isEmpty());
    }

    // =====================================================
    // syncOne
    // =====================================================

    @Test
    void syncOne_shouldSaveDocument() {

        when(documentMapper.toDocument(product))
                .thenReturn(document);

        service.syncOne(product);

        verify(searchRepository).save(document);
    }

    // =====================================================
    // updateBestPriceOnly
    // =====================================================

    @Test
    void updateBestPriceOnly_withPriceAndPlatform_shouldUpdateElastic() {

        service.updateBestPriceOnly(
                productId,
                199000,
                "Shopee"
        );

        verify(elasticsearchOperations)
                .update(
                        any(UpdateQuery.class),
                        eq(IndexCoordinates.of("products"))
                );
    }

    @Test
    void updateBestPriceOnly_onlyPrice_shouldUpdateElastic() {

        service.updateBestPriceOnly(
                productId,
                150000,
                null
        );

        verify(elasticsearchOperations)
                .update(
                        any(UpdateQuery.class),
                        eq(IndexCoordinates.of("products"))
                );
    }

    @Test
    void updateBestPriceOnly_onlyPlatform_shouldUpdateElastic() {

        service.updateBestPriceOnly(
                productId,
                null,
                "Tiki"
        );

        verify(elasticsearchOperations)
                .update(
                        any(UpdateQuery.class),
                        eq(IndexCoordinates.of("products"))
                );
    }

    @Test
    void updateBestPriceOnly_nullValues_shouldNotUpdateElastic() {

        service.updateBestPriceOnly(
                productId,
                null,
                null
        );

        verify(elasticsearchOperations, never())
                .update(any(UpdateQuery.class), any());
    }

    // =====================================================
    // clear cache
    // =====================================================

    @Test
    void clearSearchCache_shouldNotThrow() {

        assertDoesNotThrow(() ->
                service.clearSearchCache()
        );
    }
}