package com.pricehawl.repository;

import com.pricehawl.entity.ProductVideo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductVideoRepository extends JpaRepository<ProductVideo, UUID> {

    @Query("SELECT pv FROM ProductVideo pv ORDER BY pv.createdAt DESC")
    List<ProductVideo> findAllOrderByCreatedAtDesc();

    @Query(value = """
        SELECT pv.* FROM product_video pv
        JOIN product_video_mapping pvm ON pv.id = pvm.video_id
        WHERE pvm.product_id = :productId
        ORDER BY pv.created_at DESC
        """, nativeQuery = true)
    List<ProductVideo> findByProductId(@Param("productId") UUID productId);

    @Query("SELECT pv FROM ProductVideo pv ORDER BY pv.createdAt DESC")
    Page<ProductVideo> findAllOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT pv FROM ProductVideo pv WHERE LOWER(pv.title) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY pv.createdAt DESC")
    Page<ProductVideo> findByTitleContainingIgnoreCase(@Param("keyword") String keyword, Pageable pageable);

    long count();

    @Query(value = """
        SELECT p.id as productId, p.name as productName,
               COUNT(pv.id) as videoCount,
               MAX(pv.created_at) as latestCrawlDate
        FROM product p
        JOIN product_video_mapping pvm ON p.id = pvm.product_id
        JOIN product_video pv ON pvm.video_id = pv.id
        GROUP BY p.id, p.name
        ORDER BY MAX(pv.created_at) DESC
        """, nativeQuery = true)
    List<Object[]> findVideoSummaryByProduct();

    @Query(value = """
        SELECT p.id as productId, p.name as productName,
               COUNT(pv.id) as videoCount,
               MAX(pv.created_at) as latestCrawlDate
        FROM product p
        JOIN product_video_mapping pvm ON p.id = pvm.product_id
        JOIN product_video pv ON pvm.video_id = pv.id
        GROUP BY p.id, p.name
        ORDER BY MAX(pv.created_at) DESC
        """, nativeQuery = true)
    Page<Object[]> findVideoSummaryByProduct(Pageable pageable);

    @Query(value = "SELECT COUNT(DISTINCT p.id) FROM product p JOIN product_video_mapping pvm ON p.id = pvm.product_id", nativeQuery = true)
    long countVideoSummaryByProduct();

    @Query(value = """
        SELECT p.id as productId, p.name as productName,
               COUNT(pv.id) as videoCount,
               MAX(pv.created_at) as latestCrawlDate
        FROM product p
        JOIN product_video_mapping pvm ON p.id = pvm.product_id
        JOIN product_video pv ON pvm.video_id = pv.id
        WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))
        GROUP BY p.id, p.name
        ORDER BY MAX(pv.created_at) DESC
        """, nativeQuery = true)
    List<Object[]> findVideoSummaryByProductWithSearch(@Param("search") String search);

    @Query(value = """
        SELECT p.id as productId, p.name as productName,
               COUNT(pv.id) as videoCount,
               MAX(pv.created_at) as latestCrawlDate
        FROM product p
        JOIN product_video_mapping pvm ON p.id = pvm.product_id
        JOIN product_video pv ON pvm.video_id = pv.id
        WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))
        GROUP BY p.id, p.name
        ORDER BY MAX(pv.created_at) DESC
        """, nativeQuery = true)
    Page<Object[]> findVideoSummaryByProductWithSearch(@Param("search") String search, Pageable pageable);

    @Query(value = "SELECT COUNT(DISTINCT p.id) FROM product p JOIN product_video_mapping pvm ON p.id = pvm.product_id JOIN product_video pv ON pvm.video_id = pv.id WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))", nativeQuery = true)
    long countVideoSummaryByProductWithSearch(@Param("search") String search);

    @Query(value = """
        SELECT pv.id as videoId, pv.title, pv.video_url, pv.thumbnail_url,
               pv.youtube_id, pv.duration, pv.created_at, p.name as productName
        FROM product_video pv
        JOIN product_video_mapping pvm ON pv.id = pvm.video_id
        JOIN product p ON pvm.product_id = p.id
        WHERE p.id = :productId
        ORDER BY pv.created_at DESC
        """, nativeQuery = true)
    List<Object[]> findVideoDetailsByProductId(@Param("productId") UUID productId);

    @Query(value = """
        SELECT pv.id as videoId, pv.title, pv.video_url, pv.thumbnail_url,
               pv.youtube_id, pv.duration, pv.created_at, p.name as productName
        FROM product_video pv
        JOIN product_video_mapping pvm ON pv.id = pvm.video_id
        JOIN product p ON pvm.product_id = p.id
        WHERE p.id = :productId
        ORDER BY pv.created_at DESC
        """, nativeQuery = true)
    Page<Object[]> findVideoDetailsByProductId(@Param("productId") UUID productId, Pageable pageable);

    @Query(value = "SELECT COUNT(pv.id) FROM product_video pv JOIN product_video_mapping pvm ON pv.id = pvm.video_id WHERE pvm.product_id = :productId", nativeQuery = true)
    long countVideoDetailsByProductId(@Param("productId") UUID productId);

    @Query(value = """
        SELECT pv.id as videoId,
               p.id as productId,
               p.name as productName,
               p.image_url as productImageUrl,
               COALESCE(bp.min_price, 0) as bestPrice,
               COALESCE(bp.best_platform, 'Shopee') as bestPlatform,
               pv.video_url as videoUrl,
               pv.thumbnail_url as thumbnailUrl,
               pv.youtube_id as youtubeId
        FROM product_video pv
        JOIN product_video_mapping pvm ON pv.id = pvm.video_id
        JOIN product p ON pvm.product_id = p.id
        LEFT JOIN (
            SELECT pl.product_id,
                   MIN(pl.current_price) as min_price,
                   MAX(pl.platform_name) as best_platform
            FROM product_listing pl
            WHERE pl.status <> 'hidden' AND pl.current_price IS NOT NULL
            GROUP BY pl.product_id
        ) bp ON bp.product_id = p.id
        WHERE pv.youtube_id IS NOT NULL AND pv.youtube_id != ''
        ORDER BY RANDOM()
        """, nativeQuery = true)
    List<Object[]> findActiveVideosWithProduct();
}
