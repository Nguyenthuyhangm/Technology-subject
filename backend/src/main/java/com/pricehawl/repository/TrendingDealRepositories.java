package com.pricehawl.repository;

import com.pricehawl.entity.PriceAlert;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;


public final class TrendingDealRepositories {

    private TrendingDealRepositories() {
    }

    public interface TrendingDealRepository extends JpaRepository<ProductListing, UUID> {

        @Query("""
                SELECT p.id FROM ProductListing p
                JOIN p.platform plat
                WHERE (plat.isActive IS NULL OR plat.isActive = TRUE)
                  AND p.trustScore = :requiredTrustScore
                  AND EXISTS (
                      SELECT 1 FROM PriceRecord pr
                      WHERE pr.productListing = p
                        AND pr.crawledAt >= :priceSince
                  )
                """)
        Slice<UUID> findTrendingCandidateIdsSlice(
                @Param("requiredTrustScore") double requiredTrustScore,
                @Param("priceSince") LocalDateTime priceSince,
                Pageable pageable);

        @Query("""
                SELECT DISTINCT p FROM ProductListing p
                JOIN FETCH p.product
                JOIN FETCH p.platform
                WHERE p.id IN :ids
                """)
        List<ProductListing> findAllWithProductAndPlatformByIdIn(@Param("ids") Collection<UUID> ids);
    }

    public interface ProductRepository extends JpaRepository<Product, UUID> {

        @EntityGraph(attributePaths = {"category", "brand"})
        @Override
        Optional<Product> findById(UUID id);

        @EntityGraph(attributePaths = {"category", "brand"})
        @Override
        Page<Product> findAll(Pageable pageable);
    }

    public interface PriceRecordRepository extends JpaRepository<PriceRecord, Long> {

        List<PriceRecord> findByProductListingIdOrderByCrawledAtDesc(UUID productListingId);

       
        List<PriceRecord> findTop400ByProductListingIdOrderByCrawledAtDesc(UUID productListingId);

        /**
         * Batch fetch PriceRecord cho nhiều listing (tránh N+1).
         *
         * Index gợi ý (đã có ở entity):
         * - (product_listing_id, crawled_at DESC)
         *
         * Lưu ý: JPQL không "LIMIT 400 per listing" được. Service sẽ group theo listingId và cắt top N records.
         */
        @Query("""
                SELECT pr FROM PriceRecord pr
                WHERE pr.productListing.id IN :listingIds
                  AND pr.crawledAt >= :since
                ORDER BY pr.productListing.id ASC, pr.crawledAt DESC
                """)
        List<PriceRecord> findLatestPriceRecordsByListingIdsIn(
                @Param("listingIds") Collection<UUID> listingIds,
                @Param("since") LocalDateTime since);

        /**
         * Batch fetch + giới hạn số record / listing ngay tại DB để tránh timeout.
         *
         * Postgres recommended index:
         * - CREATE INDEX CONCURRENTLY idx_price_record_listing_crawled_desc ON price_record(product_listing_id, crawled_at DESC);
         *
         * Lưu ý:
         * - Dùng window function (row_number) để lấy top-N per listing.
         * - ORDER BY cuối: listing_id ASC, crawled_at DESC để service group/cắt nhanh.
         */
        @Query(value = """
                SELECT * FROM (
                    SELECT pr.*,
                           ROW_NUMBER() OVER (PARTITION BY pr.product_listing_id ORDER BY pr.crawled_at DESC) AS rn
                    FROM price_record pr
                    WHERE pr.product_listing_id IN (:listingIds)
                      AND pr.crawled_at >= :since
                ) t
                WHERE t.rn <= :capPerListing
                ORDER BY t.product_listing_id ASC, t.crawled_at DESC
                """, nativeQuery = true)
        List<PriceRecord> findLatestPriceRecordsByListingIdsInCapped(
                @Param("listingIds") Collection<UUID> listingIds,
                @Param("since") LocalDateTime since,
                @Param("capPerListing") int capPerListing);
    }

    public interface PriceAlertRepository extends JpaRepository<PriceAlert, UUID> {

        List<PriceAlert> findByUser_IdAndIsActiveTrue(UUID userId);
    }
}
