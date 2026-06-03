package com.pricehawl.service;

import com.pricehawl.dto.PriceAlertRequest;
import com.pricehawl.dto.PriceAlertResponse;
import com.pricehawl.entity.Notification;
import com.pricehawl.entity.PriceAlert;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.Platform;
import com.pricehawl.entity.User;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class)
class PriceAlertServiceTest {

    @Mock
    private PriceAlertRepository alertRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private PlatformRepository platformRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private PriceAlertService service;

    private UUID userId;
    private UUID productId;
    private Product product;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        productId = UUID.randomUUID();

        product = Product.builder()
                .id(productId)
                .name("Serum ABC")
                .imageUrl("img.jpg")
                .build();

        user = User.builder()
                .id(userId)
                .email("test@example.com")
                .plan("free")
                .build();
    }

    @Test
    void create_success() {

        PriceAlertRequest req = new PriceAlertRequest();
        req.setProductId(productId);
        req.setTargetPrice(100000);

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(productRepository.findById(productId))
                .thenReturn(Optional.of(product));

        when(alertRepository.findByUserIdAndProductId(userId, productId))
                .thenReturn(Optional.empty());

        when(alertRepository.countByUserIdAndIsActiveTrue(userId))
                .thenReturn(0L);

        PriceAlertResponse response =
                service.create(userId.toString(), req);

        assertNotNull(response);
        assertEquals(productId, response.getProductId());

        verify(alertRepository).save(any(PriceAlert.class));
    }

    @Test
    void create_userNotFound() {

        PriceAlertRequest req = new PriceAlertRequest();
        req.setProductId(productId);

        when(userRepository.findById(userId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.create(userId.toString(), req)
        );
    }

    @Test
    void create_productNotFound() {

        PriceAlertRequest req = new PriceAlertRequest();
        req.setProductId(productId);

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(productRepository.findById(productId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.create(userId.toString(), req)
        );
    }

    @Test
    void create_existingAlert_shouldUpdate() {

        PriceAlert alert = PriceAlert.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .productId(productId)
                .targetPrice(50000)
                .channel("email")
                .build();

        PriceAlertRequest req = new PriceAlertRequest();
        req.setProductId(productId);
        req.setTargetPrice(80000);

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(productRepository.findById(productId))
                .thenReturn(Optional.of(product));

        when(alertRepository.findByUserIdAndProductId(userId, productId))
                .thenReturn(Optional.of(alert));

        service.create(userId.toString(), req);

        assertEquals(80000, alert.getTargetPrice());

        verify(alertRepository).save(alert);
    }

    @Test
    void create_freePlanLimitExceeded() {

        PriceAlertRequest req = new PriceAlertRequest();
        req.setProductId(productId);

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(productRepository.findById(productId))
                .thenReturn(Optional.of(product));

        when(alertRepository.findByUserIdAndProductId(userId, productId))
                .thenReturn(Optional.empty());

        when(alertRepository.countByUserIdAndIsActiveTrue(userId))
                .thenReturn(5L);

        assertThrows(
                IllegalStateException.class,
                () -> service.create(userId.toString(), req)
        );
    }

    @Test
    void getByUser_emptyList() {

        when(alertRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of());

        List<PriceAlertResponse> result =
                service.getByUser(userId.toString());

        assertTrue(result.isEmpty());
    }
    @Test
    void getByUser_shouldMapResponse() {

        UUID alertId = UUID.randomUUID();

        PriceAlert alert = PriceAlert.builder()
                .id(alertId)
                .userId(userId)
                .productId(productId)
                .targetPrice(100000)
                .channel("email")
                .isActive(true)
                .build();

        when(alertRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(alert));

        when(productRepository.findAllByIdIn(List.of(productId)))
                .thenReturn(List.of(product));

        List<PriceAlertResponse> result =
                service.getByUser(userId.toString());

        assertEquals(1, result.size());
        assertEquals(productId, result.get(0).getProductId());
        assertEquals("Serum ABC", result.get(0).getProductName());
    }
    @Test
    void toggleActive_success() {

        UUID alertId = UUID.randomUUID();

        PriceAlert alert = PriceAlert.builder()
                .id(alertId)
                .userId(userId)
                .productId(productId)
                .isActive(true)
                .build();

        when(alertRepository.findById(alertId))
                .thenReturn(Optional.of(alert));

        when(productRepository.findById(productId))
                .thenReturn(Optional.of(product));

        service.toggleActive(alertId, userId.toString());

        assertFalse(alert.isActive());

        verify(alertRepository).save(alert);
    }
    @Test
    void toggleActive_wrongOwner() {

        UUID alertId = UUID.randomUUID();

        PriceAlert alert = PriceAlert.builder()
                .id(alertId)
                .userId(UUID.randomUUID())
                .productId(productId)
                .build();

        when(alertRepository.findById(alertId))
                .thenReturn(Optional.of(alert));

        assertThrows(
                IllegalStateException.class,
                () -> service.toggleActive(
                        alertId,
                        userId.toString()
                )
        );
    }
    @Test
    void updateTargetPrice_success() {

        UUID alertId = UUID.randomUUID();

        PriceAlert alert = PriceAlert.builder()
                .id(alertId)
                .userId(userId)
                .productId(productId)
                .targetPrice(50000)
                .build();

        when(alertRepository.findById(alertId))
                .thenReturn(Optional.of(alert));

        when(productRepository.findById(productId))
                .thenReturn(Optional.of(product));

        service.updateTargetPrice(
                alertId,
                userId.toString(),
                90000
        );

        assertEquals(90000, alert.getTargetPrice());
    }
    @Test
    void updateTargetPrice_alertNotFound() {

        UUID alertId = UUID.randomUUID();

        when(alertRepository.findById(alertId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.updateTargetPrice(
                        alertId,
                        userId.toString(),
                        100000
                )
        );
    }
    @Test
    void delete_success() {

        UUID alertId = UUID.randomUUID();

        PriceAlert alert = PriceAlert.builder()
                .id(alertId)
                .userId(userId)
                .productId(productId)
                .build();

        when(alertRepository.findById(alertId))
                .thenReturn(Optional.of(alert));

        service.delete(alertId, userId.toString());

        verify(notificationRepository)
                .deleteByAlertId(alertId);

        verify(alertRepository)
                .delete(alert);
    }
    @Test
    void delete_alertNotFound() {

        UUID alertId = UUID.randomUUID();

        when(alertRepository.findById(alertId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.delete(
                        alertId,
                        userId.toString()
                )
        );
    }
    @Test
    void getByUser_shouldResolvePlatformName() {

        Integer platformId = 1;

        Platform platform = Platform.builder()
                .id(platformId)
                .name("Hasaki")
                .build();

        PriceAlert alert = PriceAlert.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .productId(productId)
                .platformId(platformId)
                .targetPrice(100000)
                .build();

        when(alertRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(alert));

        when(productRepository.findAllByIdIn(List.of(productId)))
                .thenReturn(List.of(product));

        when(platformRepository.findById(platformId))
                .thenReturn(Optional.of(platform));

        PriceAlertResponse response =
                service.getByUser(userId.toString()).get(0);

        assertEquals(
                "Hasaki",
                response.getPlatformName()
        );
    }
    @Test
    void checkAndTrigger_shouldSkipRecentlyNotified() {

        PriceAlert alert = PriceAlert.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .productId(productId)
                .targetPrice(100000)
                .notifiedAt(LocalDateTime.now().minusHours(1))
                .build();

        when(alertRepository.findTriggerable(productId, 50000))
                .thenReturn(List.of(alert));

        when(productRepository.findById(productId))
                .thenReturn(Optional.of(product));

        service.checkAndTrigger(productId, 50000);

        verify(notificationRepository, never())
                .save(any());
    }
    @Test
    void checkAndTrigger_shouldSendEmail() {

        PriceAlert alert = PriceAlert.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .productId(productId)
                .targetPrice(60000)
                .channel("email")
                .build();

        when(alertRepository.findTriggerable(productId, 50000))
                .thenReturn(List.of(alert));

        when(productRepository.findById(productId))
                .thenReturn(Optional.of(product));

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        service.checkAndTrigger(productId, 50000);

        verify(restTemplate)
                .postForObject(
                        contains("resend"),
                        any(),
                        eq(String.class)
                );
    }
    @Test
    void checkAndTrigger_shouldIgnoreEmailException() {

        PriceAlert alert = PriceAlert.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .productId(productId)
                .targetPrice(60000)
                .channel("email")
                .build();

        when(alertRepository.findTriggerable(productId, 50000))
                .thenReturn(List.of(alert));

        when(productRepository.findById(productId))
                .thenReturn(Optional.of(product));

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        doThrow(new RuntimeException("resend down"))
                .when(restTemplate)
                .postForObject(anyString(), any(), eq(String.class));

        assertDoesNotThrow(
                () -> service.checkAndTrigger(
                        productId,
                        50000
                )
        );
    }
    @Test
    void checkAndTrigger_shouldSwallowNotificationException() {

        PriceAlert alert = PriceAlert.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .productId(productId)
                .targetPrice(60000)
                .build();

        when(alertRepository.findTriggerable(productId, 50000))
                .thenReturn(List.of(alert));

        when(productRepository.findById(productId))
                .thenReturn(Optional.of(product));

        doThrow(new RuntimeException("db"))
                .when(notificationRepository)
                .save(any());

        assertDoesNotThrow(
                () -> service.checkAndTrigger(
                        productId,
                        50000
                )
        );
    }
    @Test
    void checkAndTrigger_noAlerts() {

        when(alertRepository.findTriggerable(productId, 50000))
                .thenReturn(List.of());

        service.checkAndTrigger(productId, 50000);

        verify(notificationRepository, never())
                .save(any());
    }

    @Test
    void checkAndTrigger_productNotFound() {

        PriceAlert alert = PriceAlert.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .productId(productId)
                .targetPrice(60000)
                .build();

        when(alertRepository.findTriggerable(productId, 50000))
                .thenReturn(List.of(alert));

        when(productRepository.findById(productId))
                .thenReturn(Optional.empty());

        service.checkAndTrigger(productId, 50000);

        verify(notificationRepository, never())
                .save(any());
    }

    @Test
    void checkAndTrigger_shouldCreateNotification() {

        PriceAlert alert = PriceAlert.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .productId(productId)
                .targetPrice(60000)
                .channel("app")
                .build();

        when(alertRepository.findTriggerable(productId, 50000))
                .thenReturn(List.of(alert));

        when(productRepository.findById(productId))
                .thenReturn(Optional.of(product));

        service.checkAndTrigger(productId, 50000);

        verify(notificationRepository)
                .save(any(Notification.class));

        verify(alertRepository, atLeastOnce())
                .save(alert);
    }
}