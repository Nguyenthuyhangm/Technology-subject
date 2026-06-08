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
        SELECT pv.id as videoId, pv.title, pv.video_url, pv.thumbnail_url,
               pv.youtube_id, pv.duration, pv.created_at, p.name as productName
        FROM product_video pv
        JOIN product_video_mapping pvm ON pv.id = pvm.video_id
        JOIN product p ON pvm.product_id = p.id
        WHERE p.id = :productId
        ORDER BY pv.created_at DESC
        """, nativeQuery = true)
    List<Object[]> findVideoDetailsByProductId(@Param("productId") UUID productId);
}
