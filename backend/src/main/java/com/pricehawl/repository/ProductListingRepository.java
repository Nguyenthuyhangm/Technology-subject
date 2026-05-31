package com.pricehawl.repository;

import com.pricehawl.entity.ProductListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ProductListingRepository
        extends JpaRepository<ProductListing, UUID>, JpaSpecificationExecutor<ProductListing> {

    // =========================
    // LOGIC CŨ - GIỮ NGUYÊN
    // =========================

    List<ProductListing> findByProductId(UUID productId);

    @Query("""
            SELECT l FROM ProductListing l
              JOIN FETCH l.product p
              JOIN FETCH l.platform pl
             WHERE p.id IN :productIds
               AND LOWER(pl.name) IN :platforms
            """)
    List<ProductListing> findByProductIdInAndPlatformNameInIgnoreCase(
            @Param("productIds") Collection<UUID> productIds,
            @Param("platforms") Collection<String> platformsLowercased);

    // =========================
    // LOGIC MỚI - AUTO CRAWL GIAI ĐOẠN 1
    // =========================

    @Query("""
                SELECT pl
                FROM ProductListing pl
                JOIN FETCH pl.product p
                JOIN FETCH pl.platform pf
                WHERE LOWER(pf.name) = LOWER(:platformName)
                  AND EXISTS (
                      SELECT 1
                      FROM Wishlist w
                      WHERE w.productId = p.id
                  )
                  AND (
                      pl.crawlTime IS NULL
                      OR pl.crawlTime <= :thresholdTime
                  )
                ORDER BY pl.crawlTime ASC NULLS FIRST, pl.updatedAt ASC
            """)
    List<ProductListing> findListingsForWishlistRefresh(
            @Param("platformName") String platformName,
            @Param("thresholdTime") LocalDateTime thresholdTime);

    @Query("""
                SELECT pl
                FROM ProductListing pl
                JOIN FETCH pl.product p
                JOIN FETCH pl.platform pf
                WHERE LOWER(pf.name) = LOWER(:platformName)
                  AND NOT EXISTS (
                      SELECT 1
                      FROM Wishlist w
                      WHERE w.productId = p.id
                  )
                  AND (
                      pl.crawlTime IS NULL
                      OR pl.crawlTime <= :thresholdTime
                  )
                ORDER BY pl.crawlTime ASC NULLS FIRST, pl.updatedAt ASC
            """)
    List<ProductListing> findListingsForNormalRefresh(
            @Param("platformName") String platformName,
            @Param("thresholdTime") LocalDateTime thresholdTime);

    @Query("""
                SELECT pl
                FROM ProductListing pl
                JOIN FETCH pl.product p
                JOIN FETCH pl.platform pf
                WHERE p.id IN :productIds
            """)
    List<ProductListing> findByProductIds(@Param("productIds") List<UUID> productIds);

    // =========================
    // AUTO CRAWL - PRIORITY QUERIES (có filter crawl_time, dùng cho scheduler)
    // =========================

    @Query("""
                SELECT DISTINCT pl
                FROM ProductListing pl
                JOIN FETCH pl.product p
                JOIN FETCH pl.platform pf
                WHERE EXISTS (
                    SELECT 1 FROM PriceAlert a
                    WHERE a.productId = p.id
                      AND a.isActive = true
                )
                AND (
                    pl.crawlTime IS NULL
                    OR pl.crawlTime <= :thresholdTime
                )
                ORDER BY pl.crawlTime ASC NULLS FIRST
            """)
    List<ProductListing> findHighPriorityListings(
            @Param("thresholdTime") LocalDateTime thresholdTime);

    @Query("""
                SELECT DISTINCT pl
                FROM ProductListing pl
                JOIN FETCH pl.product p
                JOIN FETCH pl.platform pf
                WHERE EXISTS (
                    SELECT 1 FROM Wishlist w
                    WHERE w.productId = p.id
                )
                AND NOT EXISTS (
                    SELECT 1 FROM PriceAlert a
                    WHERE a.productId = p.id
                      AND a.isActive = true
                )
                AND (
                    pl.crawlTime IS NULL
                    OR pl.crawlTime <= :thresholdTime
                )
                ORDER BY pl.crawlTime ASC NULLS FIRST
            """)
    List<ProductListing> findMediumPriorityListings(
            @Param("thresholdTime") LocalDateTime thresholdTime);

    @Query("""
                SELECT DISTINCT pl
                FROM ProductListing pl
                JOIN FETCH pl.product p
                JOIN FETCH pl.platform pf
                WHERE NOT EXISTS (
                    SELECT 1 FROM Wishlist w
                    WHERE w.productId = p.id
                )
                AND NOT EXISTS (
                    SELECT 1 FROM PriceAlert a
                    WHERE a.productId = p.id
                      AND a.isActive = true
                )
                AND (
                    pl.crawlTime IS NULL
                    OR pl.crawlTime <= :thresholdTime
                )
                ORDER BY pl.crawlTime ASC NULLS FIRST
            """)
    List<ProductListing> findLowPriorityListings(
            @Param("thresholdTime") LocalDateTime thresholdTime);

    // =========================
    // FORCE QUERIES (không filter crawl_time, dùng khi admin bấm Trigger)
    // =========================

    @Query("""
                SELECT DISTINCT pl
                FROM ProductListing pl
                JOIN FETCH pl.product p
                JOIN FETCH pl.platform pf
                WHERE EXISTS (
                    SELECT 1 FROM PriceAlert a
                    WHERE a.productId = p.id
                      AND a.isActive = true
                )
                ORDER BY pl.crawlTime ASC NULLS FIRST
            """)
    List<ProductListing> findAllHighPriorityListings();

    @Query("""
                SELECT DISTINCT pl
                FROM ProductListing pl
                JOIN FETCH pl.product p
                JOIN FETCH pl.platform pf
                WHERE EXISTS (
                    SELECT 1 FROM Wishlist w
                    WHERE w.productId = p.id
                )
                AND NOT EXISTS (
                    SELECT 1 FROM PriceAlert a
                    WHERE a.productId = p.id
                      AND a.isActive = true
                )
                ORDER BY pl.crawlTime ASC NULLS FIRST
            """)
    List<ProductListing> findAllMediumPriorityListings();

    @Query("""
                SELECT DISTINCT pl
                FROM ProductListing pl
                JOIN FETCH pl.product p
                JOIN FETCH pl.platform pf
                WHERE NOT EXISTS (
                    SELECT 1 FROM Wishlist w
                    WHERE w.productId = p.id
                )
                AND NOT EXISTS (
                    SELECT 1 FROM PriceAlert a
                    WHERE a.productId = p.id
                      AND a.isActive = true
                )
                ORDER BY pl.crawlTime ASC NULLS FIRST
            """)
    List<ProductListing> findAllLowPriorityListings();

    // =========================
    // MISC
    // =========================

    List<ProductListing> findByProductIdAndPlatformNameIgnoreCase(UUID productId, String platformName);

    /**
     * TỐI ƯU: Lấy danh sách listing kèm theo Platform để tránh lỗi N+1 query.
     */
    @Query("""
        SELECT l FROM ProductListing l 
        JOIN FETCH l.platform 
        WHERE l.product.id = :productId 
        AND l.status <> 'hidden'
    """)
    List<ProductListing> findByProductIdWithPlatform(@Param("productId") UUID productId);

    List<ProductListing> findByPlatformNameIgnoreCase(String platformName);

    long countByPlatformNameIgnoreCase(String platformName);

    @Query("SELECT COUNT(pl) FROM ProductListing pl WHERE LOWER(pl.platformName) = LOWER(:platform) AND pl.crawlTime > :since")
    long countByPlatformNameIgnoreCaseAndCrawlTimeAfter(@Param("platform") String platform, @Param("since") LocalDateTime since);

    @Query("SELECT MAX(pl.crawlTime) FROM ProductListing pl WHERE LOWER(pl.platformName) = LOWER(:platform)")
    LocalDateTime findMaxCrawlTimeByPlatform(@Param("platform") String platform);

    List<ProductListing> findByInStockFalse();

    List<ProductListing> findByInStockFalseAndUpdatedAtBefore(LocalDateTime before);

    long countByInStockFalseAndUpdatedAtBefore(LocalDateTime before);
}