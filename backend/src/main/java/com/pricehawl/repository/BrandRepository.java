package com.pricehawl.repository;

import com.pricehawl.entity.Brand;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BrandRepository extends JpaRepository<Brand, Integer> {

    /** Tìm theo tên chính xác (case-sensitive) — giữ nguyên */
    Optional<Brand> findByName(String name);

    /** Tìm theo tên case-insensitive — "BIODERMA" = "Bioderma" = "bioderma" */
    Optional<Brand> findByNameIgnoreCase(String name);

    /** Tìm theo slug — đây là key chính để tránh duplicate */
    Optional<Brand> findBySlug(String slug);
}