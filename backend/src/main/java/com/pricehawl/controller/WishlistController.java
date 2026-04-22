package com.pricehawl.controller;

import com.pricehawl.dto.WishlistResponse; // Import DTO mới
import com.pricehawl.entity.Wishlist;
import com.pricehawl.service.WishlistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity; // Khuyên dùng để chuẩn REST API
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wishlist")
@CrossOrigin(origins = "http://localhost:5173") // Cho phép Frontend Vite truy cập nhanh
public class WishlistController {
    
    @Autowired
    private WishlistService wishlistService;

    /**
     * ✅ SỬA quan trọng nhất:
     * Trả về WishlistResponse để Frontend có đầy đủ: tên SP, ảnh, giá rẻ nhất.
     */
    @GetMapping("/{userId}")
    public ResponseEntity<List<WishlistResponse>> getWishlist(@PathVariable UUID userId) {
        List<WishlistResponse> wishlist = wishlistService.getWishlistByUser(userId);
        return ResponseEntity.ok(wishlist);
    }

    @PostMapping("/{userId}/add/{productId}")
    public ResponseEntity<Wishlist> add(@PathVariable UUID userId, @PathVariable UUID productId) {
        Wishlist newEntry = wishlistService.addToWishlist(userId, productId);
        if (newEntry == null) {
            return ResponseEntity.badRequest().build(); // Nếu đã tồn tại
        }
        return ResponseEntity.ok(newEntry);
    }

    @DeleteMapping("/{userId}/remove/{productId}")
    public ResponseEntity<Void> remove(@PathVariable UUID userId, @PathVariable UUID productId) {
        wishlistService.removeFromWishlist(userId, productId);
        return ResponseEntity.noContent().build(); // Trả về 204 No Content đúng chuẩn REST
    }
}