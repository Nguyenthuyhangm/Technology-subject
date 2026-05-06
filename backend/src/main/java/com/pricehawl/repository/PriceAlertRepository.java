package com.pricehawl.repository;

import com.pricehawl.entity.PriceAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PriceAlertRepository extends JpaRepository<PriceAlert, UUID> {

    List<PriceAlert> findByUser_IdAndIsActiveTrue(UUID userId);

    List<PriceAlert> findByProduct_IdAndIsActiveTrue(UUID productId);

    boolean existsByUser_IdAndProduct_IdAndPlatform_IdAndTargetPriceAndIsActiveTrue(
            UUID userId,
            UUID productId,
            Integer platformId,
            Integer targetPrice
    );

    boolean existsByUser_IdAndProduct_IdAndPlatformIsNullAndTargetPriceAndIsActiveTrue(
            UUID userId,
            UUID productId,
            Integer targetPrice
    );
}