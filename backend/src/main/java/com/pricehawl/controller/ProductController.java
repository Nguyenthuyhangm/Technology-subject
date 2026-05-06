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
            // Hỗ trợ cả 2 cú pháp: `?platform=Hasaki&platform=Cocolux` (chuẩn REST,
            // FE gửi mặc định) và `?platform=Hasaki,Cocolux` (fallback, sẽ được
            // tách ở service layer nếu cần). Null khi FE không chọn sàn nào.
            @RequestParam(value = "platform", required = false) List<String> platforms) {


        if (keyword == null || keyword.trim().isEmpty()) {
            log.debug("/products/search: keyword rỗng → trả về []");
            return Collections.emptyList();
        }

        try {
            List<ProductSearchDTO> result = service.search(keyword, platforms);

            
            if (result == null) {
                log.warn("/products/search: service.search(\"{}\") trả về null, quy về [] để FE render an toàn", keyword);
                return Collections.emptyList();
            }
            return result;

        } catch (Exception ex) {
            
            log.error(
                    "/products/search FAILED — keyword='{}', exception={}, message={}",
                    keyword,
                    ex.getClass().getSimpleName(),
                    ex.getMessage(),
                    ex);
            return Collections.emptyList();
        }
    }
}
