package com.pricehawl.controller;

import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.service.ProductService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping(path = {"/products", "/api/products"})
@CrossOrigin(origins = "http://localhost:5173")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping("/search")
    public List<ProductSearchDTO> search(
            @RequestParam(value = "q", required = false, defaultValue = "") String keyword,
            @RequestParam(value = "platform", required = false) List<String> platforms,
            @RequestParam(value = "categoryId", required = false, defaultValue = "all") String categoryId,
            @RequestParam(value = "promo", required = false, defaultValue = "all") String promo) {

        if (keyword == null || keyword.trim().isEmpty()) {
            log.debug("/products/search: keyword rỗng -> trả về []");
            return Collections.emptyList();
        }

        try {
            List<ProductSearchDTO> result = service.search(keyword, platforms, categoryId, promo);

            if (result == null) {
                log.warn(
                        "/products/search: service.search(keyword='{}', platforms={}, categoryId='{}', promo='{}') trả về null, quy về []",
                        keyword, platforms, categoryId, promo
                );
                return Collections.emptyList();
            }

            return result;

        } catch (Exception ex) {
            log.error(
                    "/products/search FAILED - keyword='{}', platforms={}, categoryId='{}', promo='{}', exception={}, message={}",
                    keyword, platforms, categoryId, promo,
                    ex.getClass().getSimpleName(),
                    ex.getMessage(),
                    ex
            );
            return Collections.emptyList();
        }
    }
}