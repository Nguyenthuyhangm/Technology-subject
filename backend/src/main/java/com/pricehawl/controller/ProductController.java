package com.pricehawl.controller;

import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.service.ProductSearchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping(path = {"/products", "/api/products"})
@CrossOrigin(origins = "http://localhost:5173")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    private final ProductSearchService service;

    public ProductController(ProductSearchService service) {
        this.service = service;
    }

    // =========================
    // 🔍 SEARCH
    // =========================
    @GetMapping("/search")
    public List<ProductSearchDTO> search(
            @RequestParam(value = "q", required = false, defaultValue = "") String keyword,
            @RequestParam(value = "userId", required = false) String userId
    ) {

        if (keyword == null || keyword.trim().isEmpty()) {
            log.debug("/products/search: keyword rỗng -> trả về []");
            return Collections.emptyList();
        }

        try {
            List<ProductSearchDTO> result = service.search(keyword, userId);

            if (result == null) {
                log.warn("/products/search: service trả về null → []");
                return Collections.emptyList();
            }

            return result;

        } catch (Exception ex) {
            log.error(
                    "/products/search FAILED - keyword='{}', userId='{}', exception={}, message={}",
                    keyword,
                    userId,
                    ex.getClass().getSimpleName(),
                    ex.getMessage(),
                    ex
            );
            return Collections.emptyList();
        }
    }

    @GetMapping("/sync")
    public String syncSearchIndex() {

        service.syncAll();

        return "SYNC OK";
    }
}