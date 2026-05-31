package com.pricehawl.repository;

import com.pricehawl.entity.AffiliateClick;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface AffiliateClickRepository extends JpaRepository<AffiliateClick, UUID> {

    long countByClickedAtAfter(LocalDateTime since);

    // Phân trang thực sự — không load hết vào RAM
    Page<AffiliateClick> findAllByOrderByClickedAtDesc(Pageable pageable);

    Page<AffiliateClick> findByPlatformIgnoreCaseOrderByClickedAtDesc(
            @Param("platform") String platform, Pageable pageable);

    long countByPlatformIgnoreCase(String platform);

    // Thống kê theo sàn — GROUP BY LOWER để tránh duplicate Tiki/tiki
    @Query(value = """
        SELECT INITCAP(LOWER(platform)) as platform, COUNT(*) as cnt
        FROM affiliate_clicks
        WHERE clicked_at > :since
        GROUP BY LOWER(platform)
        ORDER BY cnt DESC
        """, nativeQuery = true)
    List<Object[]> countGroupByPlatformSince(@Param("since") LocalDateTime since);

    @Query(value = """
        SELECT INITCAP(LOWER(platform)) as platform, COUNT(*) as cnt
        FROM affiliate_clicks
        WHERE clicked_at > :since AND LOWER(platform) = LOWER(:platform)
        GROUP BY LOWER(platform)
        """, nativeQuery = true)
    List<Object[]> countGroupByPlatformSinceFiltered(@Param("since") LocalDateTime since, @Param("platform") String platform);

    // Thống kê theo ngày — cast explicit để tránh type mismatch timestamptz vs timestamp
    @Query(value = """
        SELECT clicked_at::date as day, COUNT(*) as cnt
        FROM affiliate_clicks
        WHERE clicked_at::date >= CURRENT_DATE - 30
        GROUP BY clicked_at::date
        ORDER BY day ASC
        """, nativeQuery = true)
    List<Object[]> countByDaySince();

    @Query(value = """
        SELECT clicked_at::date as day, COUNT(*) as cnt
        FROM affiliate_clicks
        WHERE clicked_at::date >= CURRENT_DATE - 30 AND LOWER(platform) = LOWER(:platform)
        GROUP BY clicked_at::date
        ORDER BY day ASC
        """, nativeQuery = true)
    List<Object[]> countByDaySinceFiltered(@Param("platform") String platform);

    // Top sản phẩm — có thể filter platform
    @Query("SELECT a.productId, COUNT(a) as cnt FROM AffiliateClick a WHERE a.clickedAt > :since GROUP BY a.productId ORDER BY cnt DESC")
    List<Object[]> topProductsSince(@Param("since") LocalDateTime since, Pageable pageable);

    @Query("SELECT a.productId, COUNT(a) as cnt FROM AffiliateClick a WHERE a.clickedAt > :since AND LOWER(a.platform) = LOWER(:platform) GROUP BY a.productId ORDER BY cnt DESC")
    List<Object[]> topProductsSinceFiltered(@Param("since") LocalDateTime since, @Param("platform") String platform, Pageable pageable);
}
