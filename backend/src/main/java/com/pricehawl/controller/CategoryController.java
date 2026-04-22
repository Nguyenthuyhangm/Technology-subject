package com.pricehawl.controller;

import com.pricehawl.entity.Category;
import com.pricehawl.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*") // Cho phép Frontend gọi tránh lỗi CORS
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @GetMapping("/tree")
    public ResponseEntity<List<Category>> getCategoryTree() {
        List<Category> tree = categoryService.getCategoryTree();
        return ResponseEntity.ok(tree);
    }
    @GetMapping("/all")
    public ResponseEntity<List<Category>> getAllCategories() {
        // Bạn có thể dùng hàm mặc định findAll() của JpaRepository
        return ResponseEntity.ok(categoryService.getAll()); 
    }
}