package com.pricehawl.service;

import com.pricehawl.entity.Category;
import com.pricehawl.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    // Lấy ra danh sách danh mục dạng cây (chỉ lấy Root, con sẽ đi theo Root)
    public List<Category> getCategoryTree() {
        return categoryRepository.findByParentIsNull();
    }

    // Lấy tất cả danh mục (dạng phẳng) để đổ vào Dropdown lọc
    public List<Category> getAll() {
        return categoryRepository.findAll();
    }
}