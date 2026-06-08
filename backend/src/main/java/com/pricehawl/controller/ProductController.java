package com.pricehawl.controller;

import com.pricehawl.dto.AiRecommendationDTO;
import com.pricehawl.dto.ProductDupeDTO;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.repository.AiChatRepository;
import com.pricehawl.service.ProductDupeService;
import com.pricehawl.service.ProductSearchService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(path = {"/products", "/api/products"})
@CrossOrigin(origins = "http://localhost:5173")

public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    private final ProductSearchService service;
    private final AiChatRepository aiChatRepository;
    private final ProductDupeService productDupeService;

    public ProductController(ProductSearchService service, AiChatRepository aiChatRepository, ProductDupeService productDupeService) {
        this.service = service;
        this.aiChatRepository = aiChatRepository;
        this.productDupeService = productDupeService;
    }


    @GetMapping("/{productId}/dupes")
    public List<ProductDupeDTO> getDupes(
            @PathVariable UUID productId
    ) {
        return productDupeService.getDupes(productId);
    }

    @GetMapping("/search")
    public List<ProductSearchDTO> search(
            @RequestParam(value = "q", required = false, defaultValue = "") String keyword
    ) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return Collections.emptyList();
        }
        try {
            List<ProductSearchDTO> result = service.search(keyword);
            return result != null ? result : Collections.emptyList();
        } catch (Exception ex) {
            log.error("/products/search FAILED - keyword='{}': {}", keyword, ex.getMessage());
            return Collections.emptyList();
        }
    }

    @GetMapping("/{id}/similar")
    public List<AiRecommendationDTO> getSimilar(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "12") int limit
    ) {
        try {
            int safeLimit = Math.min(Math.max(limit, 1), 30);
            return aiChatRepository.findSimilarByCategory(id, safeLimit);
        } catch (Exception ex) {
            log.error("/products/{}/similar FAILED: {}", id, ex.getMessage());
            return Collections.emptyList();
        }
    }

    @GetMapping("/sync")
    public String syncSearchIndex() {
        service.syncAll();
        return "SYNC OK";
    }
}
