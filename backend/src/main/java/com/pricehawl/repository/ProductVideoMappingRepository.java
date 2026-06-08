package com.pricehawl.repository;

import com.pricehawl.entity.ProductVideoMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductVideoMappingRepository extends JpaRepository<ProductVideoMapping, UUID> {

    void deleteByVideoId(UUID videoId);

    List<ProductVideoMapping> findByVideoId(UUID videoId);

    boolean existsByVideoIdAndProductId(UUID videoId, UUID productId);

    boolean existsByProductId(UUID productId);

    Optional<UUID> findVideoIdByProductId(UUID productId);
}
