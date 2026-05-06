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
     * Batch lấy PriceRecord MỚI NHẤT cho từng productListingId trong danh sách.
     * Tránh N+1: thay vì gọi {@link #findTopByProductListingIdOrderByCrawledAtDesc}
     * cho từng listing, dùng 1 query với correlated subquery.
     *
     * Trả về tối đa 1 record / listing (giả định unique crawledAt trên từng
     * listing; nếu trùng crawledAt thì trả nhiều record — service sẽ merge).
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
}
