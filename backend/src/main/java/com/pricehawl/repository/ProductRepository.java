package com.pricehawl.repository;

import com.pricehawl.entity.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    /**
     * Lấy product kèm listings (tránh lazy load)
     */
    @EntityGraph(attributePaths = {"listings"})
    List<Product> findAllByIdIn(List<UUID> ids);

    /**
     * Fallback search (chỉ dùng khi Elasticsearch lỗi)
     */
    List<Product> findByNameContainingIgnoreCase(String keyword);

    /**
     * Lấy sản phẩm cùng hãng với sản phẩm hiện tại
     */
    @Query(value = """
        SELECT p.*
        FROM product p
        WHERE p.brand_id = (
            SELECT brand_id
            FROM product
            WHERE id = :productId
        )
        AND p.id <> :productId
        ORDER BY p.created_at DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Product> findSameBrandProducts(
            @Param("productId") UUID productId,
            @Param("limit") int limit
    );
}