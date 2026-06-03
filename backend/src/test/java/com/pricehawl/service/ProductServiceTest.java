package com.pricehawl.service;

import com.pricehawl.dto.ProductSearchDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ProductServiceTest {

    @Autowired
    private ProductSearchService searchService;

    // =========================
    // 🔹 TEST 1: SYNC
    // =========================
    @Test
    @DisplayName("SYNC should not throw exception")
    void testSync_success() {
        try {
            searchService.syncAll();
        } catch (Exception e) {
            e.printStackTrace(); // 👈 in full lỗi
            fail("❌ SYNC FAILED: " + e.getMessage());
        }
    }

    // =========================
    // 🔹 TEST 2: SEARCH CÓ DATA
    // =========================
    @Test
    @DisplayName("Search should return data for valid keyword")
    void testSearch_validKeyword() {

        searchService.syncAll();

        List<ProductSearchDTO> result = searchService.search("serum");

        assertNotNull(result, "❌ result null");
        assertFalse(result.isEmpty(), "❌ không có data → ES rỗng hoặc sync lỗi");
    }

    // =========================
    // 🔹 TEST 3: SEARCH KHÔNG CÓ DATA
    // =========================
    @Test
    @DisplayName("Search should return empty for unknown keyword")
    void testSearch_noResult() {

        searchService.syncAll();

        List<ProductSearchDTO> result = searchService.search("xyzabc123");

        assertNotNull(result);
        assertTrue(result.isEmpty(), "❌ keyword rác mà vẫn ra data");
    }

    // =========================
    // 🔹 TEST 4: VALIDATE DTO
    // =========================
    @Test
    @DisplayName("DTO should contain required fields")
    void testSearch_validateDTO() {

        searchService.syncAll();

        List<ProductSearchDTO> result = searchService.search("serum");

        assertFalse(result.isEmpty());

        ProductSearchDTO dto = result.get(0);

        assertNotNull(dto.getId(), "❌ id null");
        assertNotNull(dto.getName(), "❌ name null");
    }

    // =========================
    // 🔹 TEST 5: BEST PRICE
    // =========================
    @Test
    @DisplayName("Best price should be valid")
    void testSearch_bestPrice() {

        searchService.syncAll();

        List<ProductSearchDTO> result = searchService.search("serum");

        assertFalse(result.isEmpty());

        result.forEach(dto -> {
            if (dto.getBestPrice() != null) {
                assertTrue(dto.getBestPrice() > 0, "❌ bestPrice <= 0");
            }
        });
    }

    // =========================
    // 🔹 TEST 6: TYPO (FUZZY)
    // =========================
    @Test
    @DisplayName("Fuzzy search should handle typo")
    void testSearch_typo() {

        searchService.syncAll();

        List<ProductSearchDTO> result = searchService.search("seru"); // sai chính tả

        assertNotNull(result);
        assertFalse(result.isEmpty(), "❌ fuzzy search không hoạt động");
    }
}