package com.pricehawl.service;

import com.pricehawl.entity.User;
import com.pricehawl.entity.Wishlist;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.UserRepository;
import com.pricehawl.repository.WishlistRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WishlistServiceTest {

    @Mock
    private WishlistRepository wishlistRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WishlistService service;

    private UUID userId;
    private UUID productId;
    private User freeUser;
    private User premiumUser;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        productId = UUID.randomUUID();
        freeUser = User.builder().id(userId).email("free@test.com").name("Free").plan("free").build();
        premiumUser = User.builder().id(userId).email("premium@test.com").name("Premium").plan("premium").build();
    }

    // ── getWishlistByUser ─────────────────────────────────────────────────────

    @Test
    void getWishlistByUser_nullUserId_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class, () -> service.getWishlistByUser(null));
    }

    // ── addToWishlist ─────────────────────────────────────────────────────────

    @Test
    void addToWishlist_nullUserId_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class, () -> service.addToWishlist(null, productId));
    }

    @Test
    void addToWishlist_nullProductId_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class, () -> service.addToWishlist(userId, null));
    }

    @Test
    void addToWishlist_userNotFound_throwsResourceNotFound() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.addToWishlist(userId, productId));
    }

    @Test
    void addToWishlist_alreadyExists_returnsNull() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(freeUser));
        when(wishlistRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(true);

        Wishlist result = service.addToWishlist(userId, productId);
        assertNull(result);
        verify(wishlistRepository, never()).save(any());
    }

    @Test
    void addToWishlist_freeUserAtLimit_throwsIllegalState() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(freeUser));
        when(wishlistRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(false);
        when(wishlistRepository.countByUserId(userId)).thenReturn(20L);

        assertThrows(IllegalStateException.class, () -> service.addToWishlist(userId, productId));
        verify(wishlistRepository, never()).save(any());
    }

    @Test
    void addToWishlist_premiumUserAtLimit_savesSuccessfully() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(premiumUser));
        when(wishlistRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(false);
        when(wishlistRepository.countByUserId(userId)).thenReturn(20L);
        Wishlist saved = new Wishlist();
        saved.setUserId(userId);
        saved.setProductId(productId);
        when(wishlistRepository.save(any())).thenReturn(saved);

        Wishlist result = service.addToWishlist(userId, productId);
        assertNotNull(result);
    }

    @Test
    void addToWishlist_freeUserBelowLimit_savesSuccessfully() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(freeUser));
        when(wishlistRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(false);
        when(wishlistRepository.countByUserId(userId)).thenReturn(5L);
        Wishlist saved = new Wishlist();
        when(wishlistRepository.save(any())).thenReturn(saved);

        Wishlist result = service.addToWishlist(userId, productId);
        assertNotNull(result);
    }

    // ── removeFromWishlist ────────────────────────────────────────────────────

    @Test
    void removeFromWishlist_nullUserId_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class, () -> service.removeFromWishlist(null, productId));
    }

    @Test
    void removeFromWishlist_nullProductId_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class, () -> service.removeFromWishlist(userId, null));
    }

    @Test
    void removeFromWishlist_notExists_throwsResourceNotFound() {
        when(wishlistRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(false);
        assertThrows(ResourceNotFoundException.class, () -> service.removeFromWishlist(userId, productId));
    }

    @Test
    void removeFromWishlist_exists_deletesSuccessfully() {
        when(wishlistRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(true);
        when(wishlistRepository.deleteByUserIdAndProductId(userId, productId)).thenReturn(1);

        assertDoesNotThrow(() -> service.removeFromWishlist(userId, productId));
        verify(wishlistRepository).deleteByUserIdAndProductId(userId, productId);
    }

    @Test
    void removeFromWishlist_deleteReturns0_throwsResourceNotFound() {
        when(wishlistRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(true);
        when(wishlistRepository.deleteByUserIdAndProductId(userId, productId)).thenReturn(0);

        assertThrows(ResourceNotFoundException.class, () -> service.removeFromWishlist(userId, productId));
    }
}
