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
            @Param("platforms") Collection<String> platformsLowercased
    );

    // =========================
    // LOGIC MỚI - AUTO CRAWL GIAI ĐOẠN 1
    // =========================

    /**
     * Lấy listing Cocolux thuộc wishlist và đã quá hạn refresh.
     *
     * Vì Wishlist entity của bạn dùng:
     * - private UUID productId;
     *
     * nên query phải dùng:
     * - w.productId = p.id
     *
     * KHÔNG được dùng:
     * - w.product.id
     */
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
            @Param("thresholdTime") LocalDateTime thresholdTime
    );

    /**
     * Lấy listing Cocolux KHÔNG thuộc wishlist và đã quá hạn refresh.
     */
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
            @Param("thresholdTime") LocalDateTime thresholdTime
    );
}