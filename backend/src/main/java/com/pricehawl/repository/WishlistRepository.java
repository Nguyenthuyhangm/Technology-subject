package com.pricehawl.repository;

import com.pricehawl.entity.Wishlist;
import com.pricehawl.dto.WishlistResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, UUID> {

    /**
     * Lấy danh sách Wishlist chi tiết để hiển thị lên UI.
     * Query này thực hiện JOIN 5 bảng: wishlist -> product -> brand -> product_listing -> price_record
     * và lấy ra giá mới nhất (crawled_at gần nhất).
     */
    @Query(value = """
        SELECT 
            w.id as wishlistId, 
            p.id as productId, 
            p.name as productName, 
            b.name as brandName, 
            p.image_url as imageUrl, 
            pr.price as minPrice, 
            pl_platform.name as platformName
        FROM wishlist w
        JOIN product p ON w.product_id = p.id
        JOIN brand b ON p.brand_id = b.id
        LEFT JOIN LATERAL (
            -- Tìm listing có giá thấp nhất hiện tại của sản phẩm đó
            SELECT pl.id, pl.platform_id 
            FROM product_listing pl 
            WHERE pl.product_id = p.id 
            LIMIT 1
        ) pl ON true
        LEFT JOIN platform pl_platform ON pl.platform_id = pl_platform.id
        LEFT JOIN LATERAL (
            -- Lấy bản ghi giá mới nhất của listing đó
            SELECT price 
            FROM price_record 
            WHERE product_listing_id = pl.id 
            ORDER BY crawled_at DESC 
            LIMIT 1
        ) pr ON true
        WHERE w.user_id = :userId
        """, nativeQuery = true)
    List<WishlistResponse> findDetailedWishlistByUserId(@Param("userId") UUID userId);

    // Tìm danh sách thô (chỉ các ID)
    List<Wishlist> findByUserId(UUID userId);

    // Kiểm tra tồn tại
    boolean existsByUserIdAndProductId(UUID userId, UUID productId);

    /**
     * Xóa sản phẩm khỏi wishlist của user.
     * Cần @Modifying và @Transactional vì đây là thao tác thay đổi dữ liệu (DML).
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM Wishlist w WHERE w.userId = :userId AND w.productId = :productId")
    void deleteByUserIdAndProductId(@Param("userId") UUID userId, @Param("productId") UUID productId);
}