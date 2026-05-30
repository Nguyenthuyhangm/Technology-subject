package com.pricehawl.repository;

import com.pricehawl.dto.RecommendationProductDTO;
import com.pricehawl.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RecommendationRepository extends JpaRepository<Product, UUID> {

    @Query(value = """
        WITH user_wishlist_profile AS (
            SELECT 
                wp.category_id,
                wp.brand_id,
                wp.skin_type
            FROM wishlist w
            JOIN product wp ON w.product_id = wp.id
            WHERE w.user_id = :userId
        ),

        latest_price AS (
            SELECT DISTINCT ON (pl.product_id)
                pl.product_id,
                pr.price,
                pl.platform_name,
                pl.url
            FROM product_listing pl
            JOIN price_record pr ON pr.product_listing_id = pl.id
            ORDER BY pl.product_id, pr.price ASC, pr.crawled_at DESC
        )

        SELECT
            p.id AS id,
            p.name AS name,
            p.image_url AS "imageUrl",
            p.skin_type AS "skinType",
            c.name AS "categoryName",
            b.name AS "brandName",

            (
                CASE 
                    WHEN p.category_id IN (
                        SELECT category_id 
                        FROM user_wishlist_profile
                    ) THEN 3 ELSE 0 
                END
                +
                CASE 
                    WHEN p.brand_id IN (
                        SELECT brand_id 
                        FROM user_wishlist_profile
                    ) THEN 2 ELSE 0 
                END
                +
                CASE 
                    WHEN p.skin_type IN (
                        SELECT skin_type 
                        FROM user_wishlist_profile
                        WHERE skin_type IS NOT NULL
                    ) THEN 1 ELSE 0 
                END
            ) AS score,

            lp.price AS "lowestPrice",
            lp.platform_name AS "platformName",
            lp.url AS "productUrl"

        FROM product p
        JOIN category c ON p.category_id = c.id
        JOIN brand b ON p.brand_id = b.id
        LEFT JOIN latest_price lp ON lp.product_id = p.id

        WHERE p.id NOT IN (
            SELECT product_id
            FROM wishlist
            WHERE user_id = :userId
        )

        AND (
            p.category_id IN (
                SELECT category_id 
                FROM user_wishlist_profile
            )
            OR p.brand_id IN (
                SELECT brand_id 
                FROM user_wishlist_profile
            )
            OR p.skin_type IN (
                SELECT skin_type 
                FROM user_wishlist_profile
                WHERE skin_type IS NOT NULL
            )
        )

        ORDER BY score DESC, p.created_at DESC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<RecommendationProductDTO> findRecommendationsByUserId(
            @Param("userId") UUID userId,
            @Param("limit") int limit,
            @Param("offset") int offset
    );
}