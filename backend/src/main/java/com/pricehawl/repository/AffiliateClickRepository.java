package com.pricehawl.repository;

import com.pricehawl.entity.AffiliateClick;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface AffiliateClickRepository extends JpaRepository<AffiliateClick, UUID> {

    List<AffiliateClick> findByUserIdOrderByClickedAtDesc(UUID userId);

    long countByClickedAtAfter(LocalDateTime since);

    @Query("SELECT COUNT(a) FROM AffiliateClick a WHERE a.platform = :platform AND a.clickedAt > :since")
    long countByPlatformAndClickedAtAfter(@Param("platform") String platform, @Param("since") LocalDateTime since);
    // Thêm vào AffiliateClickRepository.java

// Phân trang + filter
@Query("SELECT a FROM AffiliateClick a ORDER BY a.clickedAt DESC")
List<AffiliateClick> findAllOrderByClickedAtDesc();

@Query("SELECT a FROM AffiliateClick a WHERE a.platform = :platform ORDER BY a.clickedAt DESC")
List<AffiliateClick> findByPlatformOrderByClickedAtDesc(@Param("platform") String platform);

@Query("SELECT a FROM AffiliateClick a WHERE a.userId = :userId ORDER BY a.clickedAt DESC")
List<AffiliateClick> findByUserIdOrderByClickedAtDescAll(@Param("userId") UUID userId);

// Thống kê theo sàn
@Query("SELECT a.platform, COUNT(a) FROM AffiliateClick a GROUP BY a.platform ORDER BY COUNT(a) DESC")
List<Object[]> countGroupByPlatform();

@Query("SELECT a.platform, COUNT(a) FROM AffiliateClick a WHERE a.clickedAt > :since GROUP BY a.platform ORDER BY COUNT(a) DESC")
List<Object[]> countGroupByPlatformSince(@Param("since") LocalDateTime since);

// Thống kê theo ngày (30 ngày gần nhất)
@Query(value = """
    SELECT DATE(clicked_at) as day, COUNT(*) as cnt
    FROM affiliate_clicks
    WHERE clicked_at > :since
    GROUP BY DATE(clicked_at)
    ORDER BY day ASC
    """, nativeQuery = true)
List<Object[]> countByDaySince(@Param("since") LocalDateTime since);

// Top sản phẩm được click nhiều
@Query("SELECT a.productId, COUNT(a) as cnt FROM AffiliateClick a WHERE a.clickedAt > :since GROUP BY a.productId ORDER BY cnt DESC")
List<Object[]> topProductsSince(@Param("since") LocalDateTime since, org.springframework.data.domain.Pageable pageable);
}