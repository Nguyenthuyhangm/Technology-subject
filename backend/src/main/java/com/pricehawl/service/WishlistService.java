package com.pricehawl.service;

import com.pricehawl.dto.WishlistResponse;
import com.pricehawl.entity.Wishlist;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.WishlistRepository;
import jakarta.persistence.PersistenceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class WishlistService {

    @Autowired
    private WishlistRepository wishlistRepository;

    public List<WishlistResponse> getWishlistByUser(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId không được null");
        }
        return wishlistRepository.findDetailedWishlistByUserId(userId);
    }

    public Wishlist addToWishlist(UUID userId, UUID productId) {
        if (userId == null || productId == null) {
            throw new IllegalArgumentException("userId và productId không được null");
        }

        if (wishlistRepository.existsByUserIdAndProductId(userId, productId)) {
            return null;
        }

        Wishlist wishlist = new Wishlist();
        wishlist.setUserId(userId);
        wishlist.setProductId(productId);
        return wishlistRepository.save(wishlist);
    }

    /**
     * Xóa wishlist item theo (userId, productId).
     *
     * Hành vi mới:
     *  - null check → IllegalArgumentException (BE trả 500 với message rõ ràng).
     *  - Nếu record không tồn tại → ném ResourceNotFoundException
     *    (GlobalExceptionHandler / Controller sẽ convert thành 404, không còn 500).
     *  - Bọc DB op trong try-catch để log chi tiết nguyên nhân (constraint, JPA,...).
     */
    @Transactional
    public void removeFromWishlist(UUID userId, UUID productId) {
        log.debug("removeFromWishlist: userId={}, productId={}", userId, productId);

        if (userId == null || productId == null) {
            log.warn("removeFromWishlist: tham số null (userId={}, productId={})", userId, productId);
            throw new IllegalArgumentException("userId và productId không được null");
        }

        // Check existence trước để có thể trả 404 rõ ràng thay vì xóa void thầm lặng
        boolean exists = wishlistRepository.existsByUserIdAndProductId(userId, productId);
        if (!exists) {
            log.info("removeFromWishlist: không tìm thấy wishlist item (userId={}, productId={})",
                    userId, productId);
            throw new ResourceNotFoundException(
                    "Wishlist item không tồn tại cho userId=" + userId + ", productId=" + productId);
        }

        try {
            int affected = wishlistRepository.deleteByUserIdAndProductId(userId, productId);
            log.info("removeFromWishlist: đã xóa {} record (userId={}, productId={})",
                    affected, userId, productId);

            if (affected == 0) {
                // Race condition: sau khi exists=true ai đó đã xóa trước
                throw new ResourceNotFoundException(
                        "Wishlist item đã bị xóa hoặc không tồn tại (userId=" + userId
                                + ", productId=" + productId + ")");
            }
        } catch (ResourceNotFoundException ex) {
            throw ex;
        } catch (DataIntegrityViolationException ex) {
            // constraint / FK violation
            log.error("removeFromWishlist: lỗi ràng buộc DB khi xóa (userId={}, productId={})",
                    userId, productId, ex);
            throw ex;
        } catch (PersistenceException ex) {
            log.error("removeFromWishlist: lỗi JPA khi xóa (userId={}, productId={})",
                    userId, productId, ex);
            throw ex;
        } catch (Exception ex) {
            log.error("removeFromWishlist: lỗi không xác định khi xóa (userId={}, productId={})",
                    userId, productId, ex);
            throw ex;
        }
    }
}
