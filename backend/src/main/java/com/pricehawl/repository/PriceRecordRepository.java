package com.pricehawl.repository;

import com.pricehawl.entity.PriceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PriceRecordRepository extends JpaRepository<PriceRecord, Long> {

    // =========================
    // LOGIC CŨ - GIỮ NGUYÊN
    // =========================

    @Query("""
        SELECT pr FROM PriceRecord pr
        JOIN FETCH pr.productListing pl
        JOIN FETCH pl.product
        JOIN FETCH pl.platform
        WHERE pl.product.id = :productId
        AND pr.crawledAt >= :sinceDate
        ORDER BY pr.crawledAt ASC
    """)
    List<PriceRecord> findPriceHistoryLast30Days(
        @Param("productId") UUID productId,
        @Param("sinceDate") LocalDateTime sinceDate
    );

    Optional<PriceRecord> findTopByProductListingIdOrderByCrawledAtDesc(UUID productListingId);

    List<PriceRecord> findByProductListingIdOrderByCrawledAtDesc(UUID productListingId);

    /**
     * Batch lấy PriceRecord mới nhất cho từng productListingId.
     */
    @Query("""
        SELECT pr FROM PriceRecord pr
        WHERE pr.productListing.id IN :listingIds
          AND pr.crawledAt = (
              SELECT MAX(pr2.crawledAt) FROM PriceRecord pr2
              WHERE pr2.productListing.id = pr.productListing.id
          )
    """)
    List<PriceRecord> findLatestByProductListingIdIn(
        @Param("listingIds") Collection<UUID> listingIds
    );

    // =========================
    // LOGIC MỚI - AUTO CRAWL GIAI ĐOẠN 1
    // KHÔNG ĐỤNG LOGIC CŨ
    // =========================

    /**
     * Lấy record giá mới nhất của một productListing.
     *
     * Ghi chú:
     * - Thực tế method findTopByProductListingIdOrderByCrawledAtDesc(...) ở trên
     *   đã làm được việc này rồi.
     * - Method này thêm vào để dùng tên rõ nghĩa hơn cho auto crawl service sau này,
     *   tránh ảnh hưởng các chỗ đang dùng method cũ.
     */
    @Query("""
        SELECT pr
        FROM PriceRecord pr
        WHERE pr.productListing.id = :productListingId
          AND pr.crawledAt = (
              SELECT MAX(pr2.crawledAt)
              FROM PriceRecord pr2
              WHERE pr2.productListing.id = :productListingId
          )
    """)
    Optional<PriceRecord> findLatestByProductListingId(
            @Param("productListingId") UUID productListingId
    );
}