package com.pricehawl.repository;

import com.pricehawl.entity.ProductDupe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductDupeRepository
        extends JpaRepository<ProductDupe, Integer> {

    List<ProductDupe> findByProductIdOrderByScoreDesc(UUID productId);

    @Query("""
         select pd.dupeProductId
         from ProductDupe pd
         where pd.productId = :productId
         order by pd.score desc 
                  """)
    List<UUID> findDupeIdsByProductId(UUID productId);
    void deleteByProductId(UUID productId);
}