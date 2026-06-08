package com.pricehawl.service;

import com.pricehawl.entity.Category;
import com.pricehawl.repository.CategoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryService categoryService;

    @Test
    void getCategoryTree_ReturnsRootCategories() {
        Category root = new Category();
        root.setName("Skincare");
        root.setParent(null);

        when(categoryRepository.findByParentIsNull()).thenReturn(List.of(root));

        List<Category> result = categoryService.getCategoryTree();

        assertEquals(1, result.size());
        assertNull(result.get(0).getParent());
    }

    @Test
    void getAll_ReturnsAllCategories() {
        Category c1 = new Category();
        Category c2 = new Category();
        when(categoryRepository.findAll()).thenReturn(List.of(c1, c2));

        List<Category> result = categoryService.getAll();

        assertEquals(2, result.size());
    }
}