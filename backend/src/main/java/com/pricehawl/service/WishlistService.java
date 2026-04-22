package com.pricehawl.service;

import com.pricehawl.dto.WishlistResponse; // Thêm import DTO mới
import com.pricehawl.entity.Wishlist;
import com.pricehawl.repository.WishlistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class WishlistService {

    @Autowired
    private WishlistRepository wishlistRepository;

    /**
     * ✅ SỬA: Thay đổi kiểu trả về từ List<Wishlist> thành List<WishlistResponse>
     * Để Frontend có thể nhận được Tên, Ảnh và Giá từ câu Query JOIN 5 bảng.
     */
    public List<WishlistResponse> getWishlistByUser(UUID userId) {
        return wishlistRepository.findDetailedWishlistByUserId(userId);
    }

    public Wishlist addToWishlist(UUID userId, UUID productId) {
        // Kiểm tra xem sản phẩm đã có trong wishlist chưa
        if (wishlistRepository.existsByUserIdAndProductId(userId, productId)) {
            // Bạn có thể ném một Custom Exception ở đây nếu muốn báo lỗi cụ thể
            return null; 
        }
        
        Wishlist wishlist = new Wishlist();
        wishlist.setUserId(userId);
        wishlist.setProductId(productId);
        
        return wishlistRepository.save(wishlist);
    }

    @Transactional
    public void removeFromWishlist(UUID userId, UUID productId) {
        // Đảm bảo xóa đúng sản phẩm thuộc về user đó
        wishlistRepository.deleteByUserIdAndProductId(userId, productId);
    }
}