package com.pricehawl.repository;

import com.pricehawl.entity.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    @EntityGraph(attributePaths = {"listings"})
    List<Product> findAllByIdIn(List<UUID> ids);

    /** Fallback search (chỉ dùng khi Elasticsearch lỗi) */
    List<Product> findByNameContainingIgnoreCase(String keyword);

    /** Exact match — dùng trong OnDemandImportService để tránh tạo duplicate */
    Optional<Product> findByNameIgnoreCase(String name);
}