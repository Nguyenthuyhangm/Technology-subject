package com.pricehawl.service;

import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.*;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("ProductService Test - Cosmetics Domain")
class ProductServiceTest {

    @Mock
    private ProductRepository repository;

    @InjectMocks
    private ProductService service;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("Should search skincare product correctly")
    void testSearch_skincareProduct() {
        UUID id = UUID.randomUUID();

        List<Object[]> mockData = Collections.singletonList(new Object[]{
                id,
                "La Roche-Posay Effaclar Serum",
                "Serum trị mụn cho da dầu",
                "Skincare",
                "La Roche-Posay",
                0.92
        });

        when(repository.fuzzySearchRaw("serum")).thenReturn(mockData);

        // 🔥 SỬA: Thêm tham số "all"
        List<ProductSearchDTO> result = service.search("serum", "all");

        assertEquals(1, result.size());

        ProductSearchDTO dto = result.get(0);

        assertEquals("La Roche-Posay Effaclar Serum", dto.getName());
        assertEquals("Skincare", dto.getCategoryName());
        assertEquals("La Roche-Posay", dto.getBrandName());
        assertTrue(dto.getScore() > 0.9);
    }

    @Test
    @DisplayName("Should handle typo keyword (fuzzy search)")
    void testSearch_typoKeyword() {
        UUID id = UUID.randomUUID();

        List<Object[]> mockData = Collections.singletonList(new Object[]{
                id,
                "Anessa Perfect UV Sunscreen",
                "Kem chống nắng cao cấp",
                "Sunscreen",
                "Anessa",
                0.75
        });

        when(repository.fuzzySearchRaw("sunsreen")).thenReturn(mockData);

        // 🔥 SỬA: Thêm tham số "all"
        List<ProductSearchDTO> result = service.search("sunsreen", "all");

        assertFalse(result.isEmpty());
        assertEquals("Anessa Perfect UV Sunscreen", result.get(0).getName());
    }

    @Test
    @DisplayName("Should handle null score safely")
    void testSearch_nullScore() {
        UUID id = UUID.randomUUID();

        List<Object[]> mockData = Collections.singletonList(new Object[]{
                id,
                "Hada Labo Gokujyun Lotion",
                "Nước hoa hồng cấp ẩm",
                "Toner",
                "Hada Labo",
                null
        });

        when(repository.fuzzySearchRaw("hada")).thenReturn(mockData);

        // 🔥 SỬA: Thêm tham số "all"
        List<ProductSearchDTO> result = service.search("hada", "all");

        assertEquals(0.0, result.get(0).getScore());
    }

    @Test
    @DisplayName("Should return empty when keyword too short")
    void testSearch_invalidKeyword() {
        // 🔥 SỬA: Thêm tham số "all"
        List<ProductSearchDTO> result = service.search("a", "all");

        assertTrue(result.isEmpty());
        verify(repository, never()).fuzzySearchRaw(any());
    }

    @Test
    @DisplayName("Should return empty when no product found")
    void testSearch_noResult() {
        when(repository.fuzzySearchRaw("xyzabc")).thenReturn(Collections.emptyList());

        // 🔥 SỬA: Thêm tham số "all"
        List<ProductSearchDTO> result = service.search("xyzabc", "all");

        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Should handle repository returning null")
    void testSearch_repoNull() {
        when(repository.fuzzySearchRaw("serum")).thenReturn(null);

        // 🔥 SỬA: Thêm tham số "all"
        List<ProductSearchDTO> result = service.search("serum", "all");

        assertTrue(result.isEmpty());
    }
}