package com.pricehawl.controller;

import com.pricehawl.dto.WishlistResponse;
import com.pricehawl.dto.WishlistRequest; // Import DTO mới
import com.pricehawl.entity.Wishlist;
import com.pricehawl.service.WishlistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wishlist")
@CrossOrigin(origins = "http://localhost:5173") 
public class WishlistController {
    
    @Autowired
    private WishlistService wishlistService;

    // 1. Lấy danh sách: Giữ nguyên PathVariable vì Frontend gọi /api/wishlist/uuid
    @GetMapping("/{userId}")
    public ResponseEntity<List<WishlistResponse>> getWishlist(@PathVariable String userId) {
        // Chuyển String sang UUID an toàn hơn
        UUID userUuid = UUID.fromString(userId);
        List<WishlistResponse> wishlist = wishlistService.getWishlistByUser(userUuid);
        return ResponseEntity.ok(wishlist);
    }

    // 2. Dùng @RequestBody để khớp với axios.post(URL, {userId, productId})
    @PostMapping("/add")
    public ResponseEntity<Wishlist> add(@RequestBody WishlistRequest request) {
        Wishlist newEntry = wishlistService.addToWishlist(request.getUserId(), request.getProductId());
        if (newEntry == null) {
            return ResponseEntity.status(409).build(); // 409 Conflict nếu đã tồn tại
        }
        return ResponseEntity.ok(newEntry);
    }

    // 3.Thông thường nên xóa theo productId của user đó
    @DeleteMapping("/{userId}/{productId}")
    public ResponseEntity<Void> remove(@PathVariable UUID userId, @PathVariable UUID productId) {
        wishlistService.removeFromWishlist(userId, productId);
        return ResponseEntity.noContent().build();
    }
}