package com.pricehawl.repository;

import com.pricehawl.entity.Wishlist;
import com.pricehawl.dto.WishlistResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, UUID> {

    @Query(value = """
        SELECT 
            w.id as "wishlistId", 
            p.id as "productId", 
            p.name as "productName", 
            b.name as "brandName", 
            pl.platform_image_url as "imageUrl", 
            pr.price as "minPrice", 
            pl_platform.name as "platformName"
        FROM wishlist w
        JOIN product p ON w.product_id = p.id
        JOIN brand b ON p.brand_id = b.id
        LEFT JOIN LATERAL (
            SELECT pl.id, pl.platform_id, pl.platform_image_url 
            FROM product_listing pl 
            WHERE pl.product_id = p.id 
            LIMIT 1
        ) pl ON true
        LEFT JOIN platform pl_platform ON pl.platform_id = pl_platform.id
        LEFT JOIN LATERAL (
            SELECT price 
            FROM price_record 
            WHERE product_listing_id = pl.id 
            ORDER BY crawled_at DESC 
            LIMIT 1
        ) pr ON true
        WHERE w.user_id = :userId
        """, nativeQuery = true)
    List<WishlistResponse> findDetailedWishlistByUserId(@Param("userId") UUID userId);

    List<Wishlist> findByUserId(UUID userId);

    boolean existsByUserIdAndProductId(UUID userId, UUID productId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Wishlist w WHERE w.userId = :userId AND w.productId = :productId")
    int deleteByUserIdAndProductId(@Param("userId") UUID userId, @Param("productId") UUID productId);

    long countByUserId(UUID userId);
}