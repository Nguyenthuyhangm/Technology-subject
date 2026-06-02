package com.pricehawl.service;

import com.pricehawl.dto.PaymentOrderDTO;
import com.pricehawl.entity.PaymentOrder;
import com.pricehawl.entity.User;
import com.pricehawl.entity.enums.PaymentMethod;
import com.pricehawl.entity.enums.PremiumPlan;
import com.pricehawl.entity.enums.PaymentStatus;
import com.pricehawl.repository.PaymentRepository;
import com.pricehawl.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentOrderServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PaymentOrderService paymentOrderService;

    private UUID userId;
    private UUID orderId;

    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        orderId = UUID.randomUUID();

        user = User.builder()
                .id(userId)
                .email("test@gmail.com")
                .name("Test")
                .plan("free")
                .build();
    }

    private PaymentOrderDTO monthlyRequest() {
        PaymentOrderDTO dto = new PaymentOrderDTO();
        dto.setPlan(PremiumPlan.MONTHLY);
        dto.setMethod(PaymentMethod.BANK_QR);
        return dto;
    }

    private PaymentOrder pendingOrder() {
        return PaymentOrder.builder()
                .id(orderId)
                .user(user)
                .plan(PremiumPlan.MONTHLY)
                .method(PaymentMethod.BANK_QR)
                .amount(29000)
                .status(PaymentStatus.PENDING)
                .build();
    }

    // =====================================================
    // CREATE ORDER
    // =====================================================

    @Test
    void createOrder_validRequest_success() {

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(paymentRepository.existsByUserIdAndStatusIn(
                eq(userId),
                anyList()
        )).thenReturn(false);

        when(paymentRepository.save(any()))
                .thenAnswer(i -> i.getArgument(0));

        PaymentOrder result =
                paymentOrderService.createOrder(userId, monthlyRequest());

        assertNotNull(result);
        assertEquals(29000, result.getAmount());
        assertEquals(PaymentStatus.PENDING, result.getStatus());

        verify(paymentRepository).save(any());
    }

    @Test
    void createOrder_activePremium_throwsConflict() {

        user.setPlan("premium");
        user.setPremiumExpiresAt(
                LocalDateTime.now().plusDays(10)
        );

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        assertThrows(
                ResponseStatusException.class,
                () -> paymentOrderService.createOrder(
                        userId,
                        monthlyRequest()
                )
        );
    }
    @Test
    void createOrder_quarterly_success() {

        PaymentOrderDTO dto = new PaymentOrderDTO();
        dto.setPlan(PremiumPlan.QUARTERLY);
        dto.setMethod(PaymentMethod.BANK_QR);

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(paymentRepository.existsByUserIdAndStatusIn(
                eq(userId),
                anyList()))
                .thenReturn(false);

        when(paymentRepository.save(any()))
                .thenAnswer(i -> i.getArgument(0));

        PaymentOrder result =
                paymentOrderService.createOrder(userId, dto);

        assertEquals(99000, result.getAmount());
    }
    @Test
    void createOrder_yearly_success() {

        PaymentOrderDTO dto = new PaymentOrderDTO();
        dto.setPlan(PremiumPlan.YEARLY);
        dto.setMethod(PaymentMethod.BANK_QR);

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(paymentRepository.existsByUserIdAndStatusIn(
                eq(userId),
                anyList()))
                .thenReturn(false);

        when(paymentRepository.save(any()))
                .thenAnswer(i -> i.getArgument(0));

        PaymentOrder result =
                paymentOrderService.createOrder(userId, dto);

        assertEquals(359000, result.getAmount());
    }
    @Test
    void createOrder_hasPendingOrder_throwsConflict() {

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(paymentRepository.existsByUserIdAndStatusIn(
                eq(userId),
                anyList()
        )).thenReturn(true);

        assertThrows(
                ResponseStatusException.class,
                () -> paymentOrderService.createOrder(
                        userId,
                        monthlyRequest()
                )
        );
    }

    // =====================================================
    // GET STATUS
    // =====================================================

    @Test
    void getStatus_success() {

        PaymentOrder order = pendingOrder();

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.of(order));

        PaymentStatus status =
                paymentOrderService.getStatus(orderId);

        assertEquals(PaymentStatus.PENDING, status);
    }

    @Test
    void getStatus_notFound() {

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResponseStatusException.class,
                () -> paymentOrderService.getStatus(orderId)
        );
    }

    // =====================================================
    // MARK SUBMITTED
    // =====================================================

    @Test
    void markSubmitted_success() {

        PaymentOrder order = pendingOrder();

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.of(order));

        paymentOrderService.markSubmitted(orderId);

        assertEquals(
                PaymentStatus.PENDING_CONFIRM,
                order.getStatus()
        );

        verify(paymentRepository).save(order);
    }
    @Test
    void markSubmitted_notFound() {

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResponseStatusException.class,
                () -> paymentOrderService.markSubmitted(orderId)
        );
    }
    @Test
    void markSubmitted_wrongStatus() {

        PaymentOrder order = pendingOrder();
        order.setStatus(PaymentStatus.PAID);

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.of(order));

        assertThrows(
                ResponseStatusException.class,
                () -> paymentOrderService.markSubmitted(orderId)
        );
    }

    // =====================================================
    // HAS PENDING
    // =====================================================
    @Test
    void getPendingOrders_success() {

        PaymentOrder order =
                PaymentOrder.builder()
                        .id(orderId)
                        .user(user)
                        .plan(PremiumPlan.MONTHLY)
                        .method(PaymentMethod.BANK_QR)
                        .amount(29000)
                        .transferCode("PHK_TEST")
                        .status(PaymentStatus.PENDING_CONFIRM)
                        .proofImage("proof.jpg")
                        .createdAt(LocalDateTime.now())
                        .build();

        when(paymentRepository.findByStatus(
                PaymentStatus.PENDING_CONFIRM))
                .thenReturn(List.of(order));

        var result =
                paymentOrderService.getPendingOrders();

        assertEquals(1, result.size());

        assertEquals(
                user.getId(),
                result.get(0).getUserId()
        );

        assertEquals(
                user.getEmail(),
                result.get(0).getUserEmail()
        );

        assertEquals(
                "MONTHLY",
                result.get(0).getPlan()
        );

        assertEquals(
                "BANK_QR",
                result.get(0).getMethod()
        );

        assertEquals(
                29000,
                result.get(0).getAmount()
        );
    }
    @Test
    void hasPendingOrder_true() {

        when(paymentRepository.existsByUserIdAndStatusIn(
                eq(userId),
                anyList()
        )).thenReturn(true);

        assertTrue(
                paymentOrderService.hasPendingOrder(userId)
        );
    }

    @Test
    void hasPendingOrder_false() {

        when(paymentRepository.existsByUserIdAndStatusIn(
                eq(userId),
                anyList()
        )).thenReturn(false);

        assertFalse(
                paymentOrderService.hasPendingOrder(userId)
        );
    }

    // =====================================================
    // PENDING COUNT
    // =====================================================

    @Test
    void getPendingCount_success() {

        when(paymentRepository.findByStatus(
                PaymentStatus.PENDING_CONFIRM
        )).thenReturn(
                List.of(
                        pendingOrder(),
                        pendingOrder()
                )
        );

        assertEquals(
                2,
                paymentOrderService.getPendingCount()
        );
    }
    @Test
    void getPendingOrders_empty() {

        when(paymentRepository.findByStatus(
                PaymentStatus.PENDING_CONFIRM))
                .thenReturn(List.of());

        assertTrue(
                paymentOrderService
                        .getPendingOrders()
                        .isEmpty()
        );
    }
    // =====================================================
    // CONFIRM PAYMENT
    // =====================================================
    @Test
    void confirmPayment_quarterly() {

        PaymentOrder order = pendingOrder();

        order.setPlan(PremiumPlan.QUARTERLY);
        order.setStatus(PaymentStatus.PENDING_CONFIRM);

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.of(order));

        paymentOrderService.confirmPayment(orderId);

        assertEquals(
                PaymentStatus.PAID,
                order.getStatus()
        );

        assertEquals(
                "premium",
                user.getPlan()
        );
    }
    @Test
    void confirmPayment_yearly() {

        PaymentOrder order = pendingOrder();

        order.setPlan(PremiumPlan.YEARLY);
        order.setStatus(PaymentStatus.PENDING_CONFIRM);

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.of(order));

        paymentOrderService.confirmPayment(orderId);

        assertEquals(
                PaymentStatus.PAID,
                order.getStatus()
        );
    }
    @Test
    void confirmPayment_notFound() {

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResponseStatusException.class,
                () -> paymentOrderService.confirmPayment(orderId)
        );
    }
    @Test
    void confirmPayment_success() {

        PaymentOrder order = pendingOrder();
        order.setStatus(PaymentStatus.PENDING_CONFIRM);

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.of(order));

        paymentOrderService.confirmPayment(orderId);

        assertEquals(
                PaymentStatus.PAID,
                order.getStatus()
        );

        assertEquals(
                "premium",
                user.getPlan()
        );

        verify(userRepository).save(user);
        verify(paymentRepository).save(order);

        verify(notificationService)
                .savePaymentNotification(
                        eq(userId),
                        anyString(),
                        anyString()
                );
    }

    @Test
    void confirmPayment_wrongStatus() {

        PaymentOrder order = pendingOrder();

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.of(order));

        assertThrows(
                ResponseStatusException.class,
                () -> paymentOrderService.confirmPayment(orderId)
        );
    }

    // =====================================================
    // REJECT PAYMENT
    // =====================================================
    @Test
    void rejectPayment_notFound() {

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResponseStatusException.class,
                () -> paymentOrderService.rejectPayment(orderId)
        );
    }
    @Test
    void rejectPayment_success() {

        PaymentOrder order = pendingOrder();
        order.setStatus(PaymentStatus.PENDING_CONFIRM);

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.of(order));

        paymentOrderService.rejectPayment(orderId);

        assertEquals(
                PaymentStatus.REJECTED,
                order.getStatus()
        );

        verify(paymentRepository).save(order);

        verify(notificationService)
                .savePaymentNotification(
                        eq(userId),
                        anyString(),
                        anyString()
                );
    }

    @Test
    void rejectPayment_wrongStatus() {

        PaymentOrder order = pendingOrder();
        order.setStatus(PaymentStatus.PAID);

        when(paymentRepository.findById(orderId))
                .thenReturn(Optional.of(order));

        assertThrows(
                ResponseStatusException.class,
                () -> paymentOrderService.rejectPayment(orderId)
        );
    }
}