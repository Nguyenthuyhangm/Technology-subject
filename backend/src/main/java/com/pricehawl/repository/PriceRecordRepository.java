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

    /**
     * TỐI ƯU DỮ LIỆU (Downsampling): Lấy giá trung bình theo từng ngày.
     * Thay vì lấy 20.000 điểm giá (10p/lần), SQL sẽ gom nhóm lại chỉ trả về 30 điểm (1 ngày/điểm).
     * Điều này giúp JSON cực nhẹ và Frontend vẽ biểu đồ siêu mượt.
     */
    @Query(value = """
        SELECT 
            pf.id as platformId, 
            pf.name as platformName, 
            date_trunc('day', pr.crawled_at) as day, 
            AVG(pr.price) as avgPrice
        FROM price_record pr
        JOIN product_listing pl ON pr.product_listing_id = pl.id
        JOIN platform pf ON pl.platform_id = pf.id
        WHERE pl.product_id = :productId 
          AND pr.crawled_at >= :sinceDate
        GROUP BY pf.id, pf.name, day
        ORDER BY platformId, day ASC
        """, nativeQuery = true)
    List<Object[]> findAggregatedPriceHistory(
        @Param("productId") UUID productId, 
        @Param("sinceDate") LocalDateTime sinceDate
    );

    /**
     * Lấy record giá mới nhất của một productListing.
     */
    Optional<PriceRecord> findTopByProductListingIdOrderByCrawledAtDesc(UUID productListingId);

    /**
     * Batch lấy PriceRecord mới nhất cho một danh sách ID listings.
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

    /**
     * Tính toán trực tiếp Average Price trên Database phục vụ Alert.
     */
    @Query("""
        SELECT AVG(pr.price) 
        FROM PriceRecord pr 
        WHERE pr.productListing.id = :listingId 
        AND pr.crawledAt >= :sinceDate
    """)
    Double getAveragePriceAfterDate(@Param("listingId") UUID listingId, @Param("sinceDate") LocalDateTime sinceDate);

    // =========================
    // LOGIC CHO AUTO CRAWL
    // =========================

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

    List<PriceRecord> findByProductListingIdOrderByCrawledAtDesc(UUID productListingId);
    
    // Giữ lại hàm cũ nếu em vẫn muốn lấy dữ liệu chi tiết cho mục đích khác
    @Query("""
        SELECT pr FROM PriceRecord pr
        JOIN FETCH pr.productListing pl
        JOIN FETCH pl.product p
        JOIN FETCH pl.platform pf
        WHERE p.id = :productId
        AND pr.crawledAt >= :sinceDate
        ORDER BY pr.crawledAt ASC
    """)
    List<PriceRecord> findPriceHistoryLast30Days(
        @Param("productId") UUID productId,
        @Param("sinceDate") LocalDateTime sinceDate
    );
}