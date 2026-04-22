package com.pricehawl.repository;

import com.pricehawl.entity.PriceAlert;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PriceAlertRepository extends JpaRepository<PriceAlert, UUID> {

    @EntityGraph(attributePaths = {"user", "product", "platform"})
    @Query("SELECT pa FROM PriceAlert pa WHERE pa.user.id = :userId ORDER BY pa.createdAt DESC")
    List<PriceAlert> findByUserIdWithDetails(@Param("userId") UUID userId);

    @EntityGraph(attributePaths = {"user", "product", "platform"})
    @Query("SELECT pa FROM PriceAlert pa WHERE pa.id = :alertId")
    Optional<PriceAlert> findByIdWithDetails(@Param("alertId") UUID alertId);

    @EntityGraph(attributePaths = {"user", "product", "platform"})
    @Query("SELECT pa FROM PriceAlert pa WHERE pa.product.id = :productId AND pa.isActive = true")
    List<PriceAlert> findActiveByProductIdWithDetails(@Param("productId") UUID productId);

    @Query("""
        SELECT CASE WHEN COUNT(pa) > 0 THEN true ELSE false END
        FROM PriceAlert pa
        WHERE pa.user.id = :userId
          AND pa.product.id = :productId
          AND (
                (:platformId IS NULL AND pa.platform IS NULL)
                OR
                (:platformId IS NOT NULL AND pa.platform.id = :platformId)
              )
          AND pa.targetPrice = :targetPrice
          AND pa.isActive = true
    """)
    boolean existsActiveDuplicate(
            @Param("userId") UUID userId,
            @Param("productId") UUID productId,
            @Param("platformId") Integer platformId,
            @Param("targetPrice") Integer targetPrice
    );

    @Query("SELECT DISTINCT pa.product.id FROM PriceAlert pa WHERE pa.isActive = true")
    List<UUID> findDistinctActiveProductIds();
}