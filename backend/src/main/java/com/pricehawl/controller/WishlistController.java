package com.pricehawl.controller;

import com.pricehawl.dto.WishlistResponse;
import com.pricehawl.dto.WishlistRequest;
import com.pricehawl.entity.Wishlist;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.service.WishlistService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/wishlist")
@CrossOrigin(origins = "http://localhost:5173")
public class WishlistController {

    @Autowired
    private WishlistService wishlistService;

    // 1) Lấy danh sách wishlist của user
    @GetMapping("/{userId}")
    public ResponseEntity<?> getWishlist(@PathVariable String userId) {
        try {
            UUID userUuid = UUID.fromString(userId);
            List<WishlistResponse> wishlist = wishlistService.getWishlistByUser(userUuid);
            return ResponseEntity.ok(wishlist);
        } catch (IllegalArgumentException ex) {
            // userId không phải UUID hợp lệ
            log.warn("getWishlist: userId không hợp lệ '{}'", userId);
            return buildError(HttpStatus.BAD_REQUEST, "userId không hợp lệ: " + userId);
        } catch (Exception ex) {
            log.error("getWishlist: lỗi khi lấy wishlist cho userId={}", userId, ex);
            return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không lấy được wishlist: " + ex.getMessage());
        }
    }

    // 2) Thêm vào wishlist
    @PostMapping("/add")
    public ResponseEntity<?> add(@RequestBody WishlistRequest request) {
        try {
            if (request == null || request.getUserId() == null || request.getProductId() == null) {
                log.warn("add: payload thiếu userId hoặc productId: {}", request);
                return buildError(HttpStatus.BAD_REQUEST,
                        "Thiếu userId hoặc productId trong payload");
            }

            Wishlist newEntry = wishlistService.addToWishlist(request.getUserId(), request.getProductId());
            if (newEntry == null) {
                // đã tồn tại
                return buildError(HttpStatus.CONFLICT,
                        "Sản phẩm đã có trong wishlist");
            }
            return ResponseEntity.ok(newEntry);
        } catch (Exception ex) {
            log.error("add: lỗi khi thêm wishlist (userId={}, productId={})",
                    request != null ? request.getUserId() : null,
                    request != null ? request.getProductId() : null, ex);
            return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không thêm được wishlist: " + ex.getMessage());
        }
    }

    /**
     * 3a) Xóa theo productId — endpoint chính FE đang gọi: DELETE /api/wishlist/{productId}?userId=xxx
     *
     * FE hiện gọi DELETE /api/wishlist/{productId} với chỉ 1 path param (productId),
     * userId truyền qua query string. Trước đây BE chỉ có endpoint 2 path param nên
     * request rơi vào no-handler → GlobalExceptionHandler bắt Exception → trả 500.
     */
    @DeleteMapping("/{productId}")
    public ResponseEntity<?> removeByProduct(
            @PathVariable("productId") String productIdRaw,
            @RequestParam(value = "userId", required = false) String userIdRaw) {

        log.info("DELETE /api/wishlist/{} (userId query = {})", productIdRaw, userIdRaw);

        // Validate input
        if (userIdRaw == null || userIdRaw.isBlank()) {
            log.warn("removeByProduct: thiếu query param userId");
            return buildError(HttpStatus.BAD_REQUEST,
                    "Thiếu query parameter 'userId'");
        }

        UUID userId;
        UUID productId;
        try {
            userId = UUID.fromString(userIdRaw);
            productId = UUID.fromString(productIdRaw);
        } catch (IllegalArgumentException ex) {
            log.warn("removeByProduct: UUID không hợp lệ userId={}, productId={}", userIdRaw, productIdRaw);
            return buildError(HttpStatus.BAD_REQUEST,
                    "userId hoặc productId không phải UUID hợp lệ");
        }

        try {
            wishlistService.removeFromWishlist(userId, productId);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException ex) {
            // không tìm thấy record → 404 thay vì 500
            log.warn("removeByProduct: không tìm thấy wishlist item (userId={}, productId={})",
                    userId, productId);
            return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
        } catch (Exception ex) {
            // log full stacktrace để biết chính xác lỗi DB/JPA/constraint
            log.error("removeByProduct: lỗi không xác định khi xóa wishlist (userId={}, productId={})",
                    userId, productId, ex);
            return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không xóa được wishlist: " + ex.getMessage());
        }
    }

    /**
     * 3b) Giữ endpoint cũ 2 path param để tương thích ngược.
     */
    @DeleteMapping("/{userId}/{productId}")
    public ResponseEntity<?> remove(@PathVariable UUID userId, @PathVariable UUID productId) {
        log.info("DELETE /api/wishlist/{}/{}", userId, productId);
        try {
            wishlistService.removeFromWishlist(userId, productId);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException ex) {
            log.warn("remove: không tìm thấy wishlist item (userId={}, productId={})", userId, productId);
            return buildError(HttpStatus.NOT_FOUND, ex.getMessage());
        } catch (Exception ex) {
            log.error("remove: lỗi khi xóa wishlist (userId={}, productId={})", userId, productId, ex);
            return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không xóa được wishlist: " + ex.getMessage());
        }
    }

    // Helper build error body đồng nhất với GlobalExceptionHandler
    private ResponseEntity<Map<String, Object>> buildError(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return new ResponseEntity<>(body, status);
    }
}
