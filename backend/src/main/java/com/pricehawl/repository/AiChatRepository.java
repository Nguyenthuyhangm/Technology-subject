package com.pricehawl.repository;

import com.pricehawl.dto.AiProductContextDTO;
import com.pricehawl.dto.AiRecommendationDTO;
import com.pricehawl.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AiChatRepository extends JpaRepository<Product, UUID> {

    @Query(value = """
        WITH latest_price AS (
            SELECT DISTINCT ON (pl.product_id)
                pl.product_id,
                pr.price AS current_price,
                pr.in_stock,
                pl.platform_name,
                pl.url,
                pr.crawled_at
            FROM product_listing pl
            JOIN price_record pr ON pr.product_listing_id = pl.id
            WHERE pl.product_id = :productId
            ORDER BY pl.product_id, pr.crawled_at DESC
        ),

        price_stats AS (
            SELECT
                pl.product_id,
                MIN(pr.price) AS lowest_price,
                AVG(
                    CASE
                        WHEN pr.crawled_at >= NOW() - INTERVAL '30 days'
                        THEN pr.price
                    END
                ) AS avg_30d_price
            FROM product_listing pl
            JOIN price_record pr ON pr.product_listing_id = pl.id
            WHERE pl.product_id = :productId
            GROUP BY pl.product_id
        )

        SELECT
            p.id AS "productId",
            p.name AS "productName",
            b.name AS "brandName",
            c.name AS "categoryName",
            p.image_url AS "imageUrl",
            p.skin_type AS "skinType",
            lp.current_price AS "currentPrice",
            ps.lowest_price AS "lowestPrice",
            ps.avg_30d_price AS "avg30dPrice",

            CASE
                WHEN ps.avg_30d_price IS NULL OR ps.avg_30d_price = 0 THEN NULL
                ELSE ROUND(
                    ((lp.current_price - ps.avg_30d_price) / ps.avg_30d_price) * 100,
                    2
                )
            END AS "priceChangePercent",

            lp.in_stock AS "inStock",
            lp.platform_name AS "platformName",
            lp.url AS "productUrl"

        FROM product p
        JOIN brand b ON p.brand_id = b.id
        JOIN category c ON p.category_id = c.id
        LEFT JOIN latest_price lp ON lp.product_id = p.id
        LEFT JOIN price_stats ps ON ps.product_id = p.id
        WHERE p.id = :productId
        """, nativeQuery = true)
    AiProductContextDTO findProductContext(@Param("productId") UUID productId);


    @Query(value = """
        WITH user_profile AS (
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
                pr.price
            FROM product_listing pl
            JOIN price_record pr ON pr.product_listing_id = pl.id
            ORDER BY pl.product_id, pr.price ASC, pr.crawled_at DESC
        )

        SELECT
            p.id AS "productId",
            p.name AS "productName",
            b.name AS "brandName",
            c.name AS "categoryName",
            p.image_url AS "imageUrl",
            lp.price AS "lowestPrice",

            (
                CASE
                    WHEN p.category_id IN (SELECT category_id FROM user_profile)
                    THEN 3 ELSE 0
                END
                +
                CASE
                    WHEN p.brand_id IN (SELECT brand_id FROM user_profile)
                    THEN 2 ELSE 0
                END
                +
                CASE
                    WHEN p.skin_type IN (
                        SELECT skin_type
                        FROM user_profile
                        WHERE skin_type IS NOT NULL
                    )
                    THEN 1 ELSE 0
                END
            ) AS "score",

            CONCAT(
                CASE
                    WHEN p.category_id IN (SELECT category_id FROM user_profile)
                    THEN 'Cùng danh mục. '
                    ELSE ''
                END,
                CASE
                    WHEN p.brand_id IN (SELECT brand_id FROM user_profile)
                    THEN 'Cùng thương hiệu. '
                    ELSE ''
                END,
                CASE
                    WHEN p.skin_type IN (
                        SELECT skin_type
                        FROM user_profile
                        WHERE skin_type IS NOT NULL
                    )
                    THEN 'Phù hợp loại da. '
                    ELSE ''
                END
            ) AS "reason"

        FROM product p
        JOIN brand b ON p.brand_id = b.id
        JOIN category c ON p.category_id = c.id
        LEFT JOIN latest_price lp ON lp.product_id = p.id

        WHERE p.id NOT IN (
            SELECT product_id
            FROM wishlist
            WHERE user_id = :userId
        )

        AND (
            p.category_id IN (SELECT category_id FROM user_profile)
            OR p.brand_id IN (SELECT brand_id FROM user_profile)
            OR p.skin_type IN (
                SELECT skin_type
                FROM user_profile
                WHERE skin_type IS NOT NULL
            )
        )

        ORDER BY "score" DESC, p.created_at DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<AiRecommendationDTO> findWishlistRecommendations(
            @Param("userId") UUID userId,
            @Param("limit") int limit
    );


    @Query(value = """
        WITH latest_price AS (
            SELECT DISTINCT ON (pl.product_id)
                pl.product_id,
                pr.price
            FROM product_listing pl
            JOIN price_record pr ON pr.product_listing_id = pl.id
            ORDER BY pl.product_id, pr.price ASC, pr.crawled_at DESC
        )

        SELECT
            p.id AS "productId",
            p.name AS "productName",
            b.name AS "brandName",
            c.name AS "categoryName",
            p.image_url AS "imageUrl",
            lp.price AS "lowestPrice",
            0 AS "score",
            'Phù hợp với câu hỏi tìm kiếm.' AS "reason"

        FROM product p
        JOIN brand b ON p.brand_id = b.id
        JOIN category c ON p.category_id = c.id
        LEFT JOIN latest_price lp ON lp.product_id = p.id

        WHERE
            LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(COALESCE(p.skin_type, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))

        ORDER BY lp.price ASC NULLS LAST, p.created_at DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<AiRecommendationDTO> searchProductsForAi(
            @Param("keyword") String keyword,
            @Param("limit") int limit
    );


    @Query(value = """
        WITH latest_price AS (
            SELECT DISTINCT ON (pl.product_id)
                pl.product_id,
                pr.price
            FROM product_listing pl
            JOIN price_record pr ON pr.product_listing_id = pl.id
            ORDER BY pl.product_id, pr.price ASC, pr.crawled_at DESC
        )

        SELECT
            p.id AS "productId",
            p.name AS "productName",
            b.name AS "brandName",
            c.name AS "categoryName",
            p.image_url AS "imageUrl",
            lp.price AS "lowestPrice",
            0 AS "score",
            'Cùng danh mục.' AS "reason"

        FROM product p
        JOIN brand b ON p.brand_id = b.id
        JOIN category c ON p.category_id = c.id
        LEFT JOIN latest_price lp ON lp.product_id = p.id

        WHERE p.category_id = (
            SELECT category_id FROM product WHERE id = :productId
        )
        AND p.id != :productId

        ORDER BY lp.price ASC NULLS LAST, p.created_at DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<AiRecommendationDTO> findSimilarByCategory(
            @Param("productId") UUID productId,
            @Param("limit") int limit
    );
}
