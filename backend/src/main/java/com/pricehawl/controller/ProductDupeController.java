package com.pricehawl.controller;

import com.pricehawl.service.ProductDupeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
