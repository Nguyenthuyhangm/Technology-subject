package com.pricehawl.repository;

import com.pricehawl.entity.CrawlError;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface CrawlErrorRepository extends JpaRepository<CrawlError, UUID> {

    List<CrawlError> findTop50ByOrderByCrawledAtDesc();

    List<CrawlError> findByPlatformIgnoreCaseOrderByCrawledAtDesc(String platform);

    long countByPlatformIgnoreCase(String platform);

    long countByCrawledAtAfter(LocalDateTime since);

    @Query("SELECT e.platform, COUNT(e) FROM CrawlError e GROUP BY e.platform ORDER BY COUNT(e) DESC")
    List<Object[]> countByPlatformGrouped();
    List<CrawlError> findAllByOrderByCrawledAtDesc();

void deleteByPlatformIgnoreCase(String platform);
}