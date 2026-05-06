package com.pricehawl.repository;

import com.pricehawl.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    // Tìm các danh mục gốc (không có danh mục cha) để tạo khung cây
    List<Category> findByParentIsNull();

    // Tìm danh mục theo slug (ví dụ: "sua-rua-mat")
    Optional<Category> findBySlug(String slug);
}