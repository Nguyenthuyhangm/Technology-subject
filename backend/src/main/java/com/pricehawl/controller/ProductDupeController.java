package com.pricehawl.controller;

import com.pricehawl.dto.ProductDupeDTO;
import com.pricehawl.service.ProductDupeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/dupes")
@RequiredArgsConstructor
public class ProductDupeController {

    private final ProductDupeService productDupeService;

    @PostMapping("/rebuild")
    public String rebuild() {
        productDupeService.buildAllDupes();
        return "DONE";
    }

    @GetMapping("/products/{productId}/dupes")
    public List<ProductDupeDTO> getDupes(@PathVariable UUID productId) {
        return productDupeService.getDupes(productId);
    }
}
