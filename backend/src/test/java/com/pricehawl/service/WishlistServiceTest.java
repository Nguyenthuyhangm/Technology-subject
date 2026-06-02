package com.pricehawl.service;

import com.pricehawl.dto.WishlistResponse;
import com.pricehawl.entity.User;
import com.pricehawl.entity.Wishlist;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.UserRepository;
import com.pricehawl.repository.WishlistRepository;
import jakarta.persistence.PersistenceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WishlistServiceTest {

    @Mock
    private WishlistRepository wishlistRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WishlistService wishlistService;

    private UUID userId;
    private UUID productId;

    @BeforeEach
    void setup() {
        userId = UUID.randomUUID();
        productId = UUID.randomUUID();
    }

    // ====================================================
    // getWishlistByUser
    // ====================================================

    @Test
    void getWishlistByUser_shouldThrowWhenUserIdNull() {

        assertThrows(
                IllegalArgumentException.class,
                () -> wishlistService.getWishlistByUser(null)
        );
    }

    @Test
    void getWishlistByUser_shouldReturnWishlist() {

        List<WishlistResponse> expected = List.of();

        when(wishlistRepository.findDetailedWishlistByUserId(userId))
                .thenReturn(expected);

        List<WishlistResponse> result =
                wishlistService.getWishlistByUser(userId);

        assertSame(expected, result);

        verify(wishlistRepository)
                .findDetailedWishlistByUserId(userId);
    }

    // ====================================================
    // addToWishlist
    // ====================================================

    @Test
    void addToWishlist_shouldThrowWhenUserIdNull() {

        assertThrows(
                IllegalArgumentException.class,
                () -> wishlistService.addToWishlist(
                        null,
                        productId
                )
        );
    }

    @Test
    void addToWishlist_shouldThrowWhenProductIdNull() {

        assertThrows(
                IllegalArgumentException.class,
                () -> wishlistService.addToWishlist(
                        userId,
                        null
                )
        );
    }

    @Test
    void addToWishlist_shouldThrowWhenUserNotFound() {

        when(userRepository.findById(userId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> wishlistService.addToWishlist(
                        userId,
                        productId
                )
        );
    }

    @Test
    void addToWishlist_shouldReturnNullWhenAlreadyExists() {

        User user =
                User.builder()
                        .id(userId)
                        .plan("free")
                        .build();

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(wishlistRepository.existsByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(true);

        Wishlist result =
                wishlistService.addToWishlist(
                        userId,
                        productId
                );

        assertNull(result);

        verify(wishlistRepository, never())
                .save(any());
    }

    @Test
    void addToWishlist_shouldThrowWhenFreeLimitReached() {

        User user =
                User.builder()
                        .id(userId)
                        .plan("free")
                        .build();

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(wishlistRepository.existsByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(false);

        when(wishlistRepository.countByUserId(userId))
                .thenReturn(20L);

        assertThrows(
                IllegalStateException.class,
                () -> wishlistService.addToWishlist(
                        userId,
                        productId
                )
        );
    }

    @Test
    void addToWishlist_shouldAllowPremiumUserOverLimit() {

        User user =
                User.builder()
                        .id(userId)
                        .plan("premium")
                        .build();

        Wishlist saved = new Wishlist();

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(wishlistRepository.existsByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(false);

        when(wishlistRepository.countByUserId(userId))
                .thenReturn(999L);

        when(wishlistRepository.save(any(Wishlist.class)))
                .thenReturn(saved);

        Wishlist result =
                wishlistService.addToWishlist(
                        userId,
                        productId
                );

        assertSame(saved, result);
    }

    @Test
    void addToWishlist_shouldSaveSuccessfullyForFreeUser() {

        User user =
                User.builder()
                        .id(userId)
                        .plan("free")
                        .build();

        Wishlist saved = new Wishlist();

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(wishlistRepository.existsByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(false);

        when(wishlistRepository.countByUserId(userId))
                .thenReturn(5L);

        when(wishlistRepository.save(any(Wishlist.class)))
                .thenReturn(saved);

        Wishlist result =
                wishlistService.addToWishlist(
                        userId,
                        productId
                );

        assertSame(saved, result);
    }

    // ====================================================
    // removeFromWishlist
    // ====================================================

    @Test
    void removeFromWishlist_shouldThrowWhenUserIdNull() {

        assertThrows(
                IllegalArgumentException.class,
                () -> wishlistService.removeFromWishlist(
                        null,
                        productId
                )
        );
    }

    @Test
    void removeFromWishlist_shouldThrowWhenProductIdNull() {

        assertThrows(
                IllegalArgumentException.class,
                () -> wishlistService.removeFromWishlist(
                        userId,
                        null
                )
        );
    }

    @Test
    void removeFromWishlist_shouldThrowWhenNotExists() {

        when(wishlistRepository.existsByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> wishlistService.removeFromWishlist(
                        userId,
                        productId
                )
        );
    }

    @Test
    void removeFromWishlist_shouldDeleteSuccessfully() {

        when(wishlistRepository.existsByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(true);

        when(wishlistRepository.deleteByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(1);

        assertDoesNotThrow(
                () -> wishlistService.removeFromWishlist(
                        userId,
                        productId
                )
        );
    }

    @Test
    void removeFromWishlist_shouldThrowWhenDeleteAffectedZero() {

        when(wishlistRepository.existsByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(true);

        when(wishlistRepository.deleteByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(0);

        assertThrows(
                ResourceNotFoundException.class,
                () -> wishlistService.removeFromWishlist(
                        userId,
                        productId
                )
        );
    }

    @Test
    void removeFromWishlist_shouldRethrowDataIntegrityViolationException() {

        when(wishlistRepository.existsByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(true);

        when(wishlistRepository.deleteByUserIdAndProductId(
                userId,
                productId
        )).thenThrow(new DataIntegrityViolationException("DB"));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> wishlistService.removeFromWishlist(
                        userId,
                        productId
                )
        );
    }

    @Test
    void removeFromWishlist_shouldRethrowPersistenceException() {

        when(wishlistRepository.existsByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(true);

        when(wishlistRepository.deleteByUserIdAndProductId(
                userId,
                productId
        )).thenThrow(new PersistenceException("JPA"));

        assertThrows(
                PersistenceException.class,
                () -> wishlistService.removeFromWishlist(
                        userId,
                        productId
                )
        );
    }

    @Test
    void removeFromWishlist_shouldRethrowGenericException() {

        when(wishlistRepository.existsByUserIdAndProductId(
                userId,
                productId
        )).thenReturn(true);

        when(wishlistRepository.deleteByUserIdAndProductId(
                userId,
                productId
        )).thenThrow(new RuntimeException("Unknown"));

        assertThrows(
                RuntimeException.class,
                () -> wishlistService.removeFromWishlist(
                        userId,
                        productId
                )
        );
    }
}

