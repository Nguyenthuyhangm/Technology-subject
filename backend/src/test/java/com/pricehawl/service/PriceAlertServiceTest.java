package com.pricehawl.service;

import com.pricehawl.dto.PriceAlertRequest;
import com.pricehawl.dto.PriceAlertResponse;
import com.pricehawl.entity.PriceAlert;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.User;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PriceAlertServiceTest {

    @Mock private PriceAlertRepository alertRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private ProductRepository productRepository;
    @Mock private PlatformRepository platformRepository;
    @Mock private UserRepository userRepository;
    @Mock private RestTemplate restTemplate;

    @InjectMocks
    private PriceAlertService service;

    private UUID userId;
    private UUID productId;
    private UUID alertId;
    private User freeUser;
    private User premiumUser;
    private Product product;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        productId = UUID.randomUUID();
        alertId = UUID.randomUUID();
        freeUser = User.builder().id(userId).email("free@test.com").name("Free").plan("free").build();
        premiumUser = User.builder().id(userId).email("premium@test.com").name("Premium").plan("premium").build();
        product = Product.builder().id(productId).name("Kem dưỡng da").build();
    }

    private PriceAlertRequest req(int targetPrice) {
        PriceAlertRequest r = new PriceAlertRequest();
        r.setProductId(productId);
        r.setTargetPrice(targetPrice);
        r.setChannel("email");
        return r;
    }

    private PriceAlert existingAlert() {
        return PriceAlert.builder()
                .id(alertId)
                .userId(userId)
                .productId(productId)
                .targetPrice(100_000)
                .channel("email")
                .isActive(true)
                .build();
    }

    // ── create: upsert khi đã có alert ───────────────────────────────────────

    @Test
    void create_existingAlert_updatesAndReturns() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(freeUser));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        PriceAlert alert = existingAlert();
        when(alertRepository.findByUserIdAndProductId(userId, productId)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any())).thenReturn(alert);
        when(platformRepository.findById(any())).thenReturn(Optional.empty());

        PriceAlertResponse response = service.create(userId.toString(), req(90_000));
        assertNotNull(response);
        verify(alertRepository).save(alert);
    }

    // ── create: free user chưa đạt limit ─────────────────────────────────────

    @Test
    void create_freeUserBelowLimit_createsAlert() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(freeUser));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(alertRepository.findByUserIdAndProductId(userId, productId)).thenReturn(Optional.empty());
        when(alertRepository.countByUserIdAndIsActiveTrue(userId)).thenReturn(2L);
        PriceAlert saved = existingAlert();
        when(alertRepository.save(any())).thenReturn(saved);
        when(platformRepository.findById(any())).thenReturn(Optional.empty());

        PriceAlertResponse response = service.create(userId.toString(), req(90_000));
        assertNotNull(response);
    }

    // ── create: free user đạt limit → exception ───────────────────────────────

    @Test
    void create_freeUserAtLimit_throwsIllegalState() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(freeUser));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(alertRepository.findByUserIdAndProductId(userId, productId)).thenReturn(Optional.empty());
        when(alertRepository.countByUserIdAndIsActiveTrue(userId)).thenReturn(5L);

        assertThrows(IllegalStateException.class,
                () -> service.create(userId.toString(), req(90_000)));
        verify(alertRepository, never()).save(any());
    }

    // ── create: premium user vượt limit → vẫn tạo được ──────────────────────

    @Test
    void create_premiumUserOverLimit_createsAlert() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(premiumUser));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(alertRepository.findByUserIdAndProductId(userId, productId)).thenReturn(Optional.empty());
        when(alertRepository.countByUserIdAndIsActiveTrue(userId)).thenReturn(10L);
        PriceAlert saved = existingAlert();
        when(alertRepository.save(any())).thenReturn(saved);
        when(platformRepository.findById(any())).thenReturn(Optional.empty());

        PriceAlertResponse response = service.create(userId.toString(), req(90_000));
        assertNotNull(response);
    }

    // ── create: user không tồn tại → exception ───────────────────────────────

    @Test
    void create_userNotFound_throwsResourceNotFound() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.create(userId.toString(), req(90_000)));
    }

    // ── toggleActive ──────────────────────────────────────────────────────────

    @Test
    void toggleActive_ownerToggle_flipsActive() {
        PriceAlert alert = existingAlert();
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any())).thenReturn(alert);
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(platformRepository.findById(any())).thenReturn(Optional.empty());

        PriceAlertResponse response = service.toggleActive(alertId, userId.toString());
        assertNotNull(response);
        verify(alertRepository).save(alert);
    }

    @Test
    void toggleActive_wrongOwner_throwsIllegalState() {
        PriceAlert alert = existingAlert();
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));

        String otherUserId = UUID.randomUUID().toString();
        assertThrows(IllegalStateException.class,
                () -> service.toggleActive(alertId, otherUserId));
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    void delete_owner_deletesSuccessfully() {
        PriceAlert alert = existingAlert();
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));

        assertDoesNotThrow(() -> service.delete(alertId, userId.toString()));
        verify(notificationRepository).deleteByAlertId(alertId);
        verify(alertRepository).delete(alert);
    }

    @Test
    void delete_alertNotFound_throwsResourceNotFound() {
        when(alertRepository.findById(alertId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.delete(alertId, userId.toString()));
    }
}
