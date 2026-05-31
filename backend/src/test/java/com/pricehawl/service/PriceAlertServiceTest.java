package com.pricehawl.service;

import com.pricehawl.dto.PriceAlertRequest;
import com.pricehawl.dto.PriceAlertResponse;
import com.pricehawl.entity.PriceAlert;
import com.pricehawl.entity.Product;
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
        
        freeUser = User.builder()
                .id(userId)
                .email("free@test.com")
                .name("Free User")
                .plan("free")
                .build();
                
        premiumUser = User.builder()
                .id(userId)
                .email("premium@test.com")
                .name("Premium User")
                .plan("premium")
                .build();
                
        product = Product.builder()
                .id(productId)
                .name("Kem dưỡng da")
                .imageUrl("http://image.com/skin.png")
                .build();
    }

    private PriceAlertRequest createReq(int targetPrice) {
        PriceAlertRequest r = new PriceAlertRequest();
        r.setProductId(productId);
        r.setTargetPrice(targetPrice);
        r.setChannel("email");
        return r;
    }

    private PriceAlert createMockAlert() {
        return PriceAlert.builder()
                .id(alertId)
                .userId(userId)
                .productId(productId)
                .targetPrice(100_000)
                .channel("email")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("Create: Upsert khi đã tồn tại Alert cho sản phẩm này")
    void create_existingAlert_updatesAndReturns() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(freeUser));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        
        PriceAlert existingAlert = createMockAlert();
        when(alertRepository.findByUserIdAndProductId(userId, productId)).thenReturn(Optional.of(existingAlert));
        
        // Thực thi
        PriceAlertResponse response = service.create(userId.toString(), createReq(90_000));

        // Kiểm chứng
        assertNotNull(response);
        assertEquals(90_000, existingAlert.getTargetPrice());
        verify(alertRepository).save(existingAlert);
    }

    @Test
    @DisplayName("Create: Free user đạt giới hạn 5 alert -> Ném lỗi")
    void create_freeUserAtLimit_throwsIllegalState() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(freeUser));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(alertRepository.findByUserIdAndProductId(userId, productId)).thenReturn(Optional.empty());
        
        // Giả lập đã có 5 alert (FREE_PLAN_LIMIT = 5)
        when(alertRepository.countByUserIdAndIsActiveTrue(userId)).thenReturn(5L);

        assertThrows(IllegalStateException.class, 
                () -> service.create(userId.toString(), createReq(80_000)));
        
        verify(alertRepository, never()).save(any());
    }

    @Test
    @DisplayName("Create: Premium user vượt limit -> Vẫn tạo thành công")
    void create_premiumUserOverLimit_success() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(premiumUser));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(alertRepository.findByUserIdAndProductId(userId, productId)).thenReturn(Optional.empty());
        
        // Premium có 10 alerts vẫn ok
        when(alertRepository.countByUserIdAndIsActiveTrue(userId)).thenReturn(10L);
        
        PriceAlert savedAlert = createMockAlert();
        when(alertRepository.save(any())).thenReturn(savedAlert);

        PriceAlertResponse response = service.create(userId.toString(), createReq(70_000));
        
        assertNotNull(response);
        verify(alertRepository).save(any());
    }

    @Test
    @DisplayName("ToggleActive: Đảo ngược trạng thái Active")
    void toggleActive_success() {
        PriceAlert alert = createMockAlert(); // Đang true
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));

        PriceAlertResponse response = service.toggleActive(alertId, userId.toString());

        assertFalse(alert.isActive()); // Đã đảo sang false
        verify(alertRepository).save(alert);
    }

    @Test
    @DisplayName("Delete: Xóa alert và các thông báo liên quan")
    void delete_success() {
        PriceAlert alert = createMockAlert();
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));

        assertDoesNotThrow(() -> service.delete(alertId, userId.toString()));

        verify(notificationRepository).deleteByAlertId(alertId);
        verify(alertRepository).delete(alert);
    }

    @Test
    @DisplayName("FindAndVerify: Sai chủ sở hữu -> Ném lỗi bảo mật")
    void delete_wrongOwner_throwsException() {
        PriceAlert alert = createMockAlert();
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));

        String otherUserId = UUID.randomUUID().toString();
        
        assertThrows(IllegalStateException.class, 
                () -> service.delete(alertId, otherUserId));
    }
}