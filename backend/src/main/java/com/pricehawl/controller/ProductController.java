package com.pricehawl.controller;

import com.pricehawl.dto.AiRecommendationDTO;
import com.pricehawl.dto.ProductDupeDTO;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.dto.ProductVideoDTO;
import com.pricehawl.dto.VideoWithProductDTO;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.AiChatRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.service.ProductDupeService;
import com.pricehawl.service.ProductSearchService;
import com.pricehawl.service.ProductVideoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(path = {"/products", "/api/products"})
@CrossOrigin(originPatterns = {"*"})
public class ProductController {

    private record ByUrlResponse(String productId, String productName) {}

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    private final ProductSearchService service;
    private final AiChatRepository aiChatRepository;
    private final ProductVideoService productVideoService;
    private final ProductListingRepository listingRepository;
    private final ProductDupeService productDupeService;

    public ProductController(ProductSearchService service, AiChatRepository aiChatRepository,
                             ProductVideoService productVideoService,
                             ProductListingRepository listingRepository,
                             ProductDupeService productDupeService) {
        this.service = service;
        this.aiChatRepository = aiChatRepository;
        this.productVideoService = productVideoService;
        this.listingRepository = listingRepository;
        this.productDupeService = productDupeService;
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

    @GetMapping("/by-url")
    public ResponseEntity<?> findByUrl(@RequestParam String url) {
        if (url == null || url.isBlank())
            return ResponseEntity.badRequest().body("url is required");

        java.util.Optional<ProductListing> listing = listingRepository.findByUrl(url);
        if (listing.isEmpty() && url.contains("?")) {
            String urlNoQuery = url.substring(0, url.indexOf("?"));
            listing = listingRepository.findByUrl(urlNoQuery);
            if (listing.isEmpty()) {
                String spid = extractSpid(url);
                if (spid != null) {
                    listing = listingRepository.findByUrl(urlNoQuery + "?spid=" + spid);
                }
            }
            if (listing.isEmpty()) {
                listing = listingRepository.findFirstByUrlStartingWith(urlNoQuery);
            }
        }
        if (listing.isEmpty()) {
            listing = listingRepository.findFirstByUrlStartingWith(url);
        }

        if (listing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ProductListing pl = listing.get();
        return ResponseEntity.ok(new ByUrlResponse(
            pl.getProduct().getId().toString(),
            pl.getProduct().getName()
        ));
    }

    private String extractSpid(String url) {
        try {
            String query = url.substring(url.indexOf("?") + 1);
            for (String param : query.split("&")) {
                if (param.startsWith("spid=")) {
                    return param.substring(5);
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    @GetMapping("/videos/active")
    public List<VideoWithProductDTO> getActiveVideos() {
        return productVideoService.getActiveVideos();
    }

    @GetMapping("/{productId}/videos")
    public List<ProductVideoDTO> getVideosByProduct(@PathVariable UUID productId) {
        return productVideoService.getVideosByProductId(productId);
    }

    @GetMapping("/{productId}/dupes")
    public List<ProductDupeDTO> getDupes(@PathVariable UUID productId) {
        return productDupeService.getDupes(productId);
    }
}
