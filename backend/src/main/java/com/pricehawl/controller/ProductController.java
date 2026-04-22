package com.pricehawl.controller;

import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.service.ProductService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
@CrossOrigin(origins = "http://localhost:5173")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    //Thêm  @RequestParam cho promo và truyền đủ 3 biến xuống service
    @GetMapping("/search")
    public List<ProductSearchDTO> search(
            @RequestParam("q") String keyword,
            @RequestParam(value = "categoryId", required = false, defaultValue = "all") String categoryId,
            @RequestParam(value = "promo", required = false, defaultValue = "all") String promo
    ) {
        return service.search(keyword, categoryId, promo);
    }
}