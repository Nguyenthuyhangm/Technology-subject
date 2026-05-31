package com.pricehawl.repository;

import com.pricehawl.entity.PriceAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional; // <-- Add this import
import java.util.UUID;

public interface PriceAlertRepository extends JpaRepository<PriceAlert, UUID> {

    List<PriceAlert> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    long countByUserIdAndIsActiveTrue(UUID userId);

    long countByIsActiveTrue(); // ← thêm dòng này

    @Query("""
        SELECT a FROM PriceAlert a
        WHERE a.productId = :productId
          AND a.isActive = true
          AND a.targetPrice >= :currentPrice
    """)
    List<PriceAlert> findTriggerable(
        @Param("productId") UUID productId,
        @Param("currentPrice") int currentPrice
    );
    
    Optional<PriceAlert> findByUserIdAndProductId(UUID userId, UUID productId);
}