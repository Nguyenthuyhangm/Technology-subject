package com.pricehawl.repository;

import com.pricehawl.entity.ProductListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ProductListingRepository
        extends JpaRepository<ProductListing, UUID>, JpaSpecificationExecutor<ProductListing> {

    // Lấy tất cả listing của 1 product
    List<ProductListing> findByProductId(UUID productId);

    /**
     * Dynamic filter theo platform name (case-insensitive) + danh sách product id.
     *
     * Cách xây dựng:
     *  - JOIN FETCH product + platform để FE render đủ thông tin trong 1 query.
     *  - `LOWER(pl.name) IN (:platforms)` -> caller tự lowercase trước khi truyền
     *    vào, giúp match không phân biệt hoa/thường (Cocolux / cocolux / COCOLUX).
     *
     * Cách xử lý multiple platforms:
     *  - `:platforms` là Collection<String>. JPA sẽ render thành `IN (?, ?, ?)`.
     *  - Nếu caller muốn "không filter platform" → KHÔNG gọi method này, dùng
     *    {@link #findByProductId} hoặc repository khác. Method này yêu cầu
     *    platforms non-empty (JPA ném lỗi khi IN () rỗng).
     */
    @Query("""
            SELECT l FROM ProductListing l
              JOIN FETCH l.product p
              JOIN FETCH l.platform pl
             WHERE p.id IN :productIds
               AND LOWER(pl.name) IN :platforms
            """)
    List<ProductListing> findByProductIdInAndPlatformNameInIgnoreCase(
            @Param("productIds") Collection<UUID> productIds,
            @Param("platforms") Collection<String> platformsLowercased);
}
