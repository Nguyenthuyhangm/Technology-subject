package com.pricehawl.service;

import com.pricehawl.dto.PaymentOrderDTO;
import com.pricehawl.dto.PaymentOrderResponse;
import com.pricehawl.entity.PaymentOrder;
import com.pricehawl.entity.User;
import com.pricehawl.entity.enums.PaymentStatus;
import com.pricehawl.repository.PaymentRepository;
import com.pricehawl.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentOrderService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public PaymentOrder createOrder(UUID userId, PaymentOrderDTO req) {
        User user = userRepository.findById(userId).orElseThrow();

        // Không cho upgrade khi premium còn hạn
        if ("premium".equalsIgnoreCase(user.getPlan())
                && user.getPremiumExpiresAt() != null
                && user.getPremiumExpiresAt().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tài khoản Premium của bạn vẫn còn hiệu lực.");
        }

        // Không cho tạo order mới khi đã có order đang chờ
        boolean hasPending = paymentRepository.existsByUserIdAndStatusIn(
                userId, List.of(PaymentStatus.PENDING, PaymentStatus.PENDING_CONFIRM));
        if (hasPending) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bạn đã có yêu cầu thanh toán đang chờ xử lý. Vui lòng chờ admin duyệt.");
        }

        int amount = switch (req.getPlan()) {
            case MONTHLY -> 29000;
            case QUARTERLY -> 99000;
            case YEARLY -> 359000;
        };

        PaymentOrder order = PaymentOrder.builder()
                .user(user)
                .plan(req.getPlan())
                .method(req.getMethod())
                .amount(amount)
                .transferCode(generateCode())
                .status(PaymentStatus.PENDING)
                .build();

        return paymentRepository.save(order);
    }

    @Transactional(readOnly = true)
    public PaymentStatus getStatus(UUID orderId) {
        return paymentRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment order not found"))
                .getStatus();
    }

    @Transactional
    public void markSubmitted(UUID orderId) {
        PaymentOrder order = paymentRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment order not found"));

        if (order.getStatus() != PaymentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Yêu cầu đã được gửi, vui lòng chờ admin duyệt.");
        }

        order.setStatus(PaymentStatus.PENDING_CONFIRM);
        order.setSubmittedAt(LocalDateTime.now());
        paymentRepository.save(order);
    }

    /** User check xem mình có order đang chờ không */
    @Transactional(readOnly = true)
    public boolean hasPendingOrder(UUID userId) {
        return paymentRepository.existsByUserIdAndStatusIn(
                userId, List.of(PaymentStatus.PENDING, PaymentStatus.PENDING_CONFIRM));
    }

    @Transactional(readOnly = true)
    public List<PaymentOrderResponse> getPendingOrders() {
        return paymentRepository.findByStatus(PaymentStatus.PENDING_CONFIRM)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getPendingCount() {
        return paymentRepository.findByStatus(PaymentStatus.PENDING_CONFIRM).size();
    }

    @Transactional
    public void confirmPayment(UUID orderId) {
        PaymentOrder order = paymentRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment order not found"));

        if (order.getStatus() != PaymentStatus.PENDING_CONFIRM) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment not ready to confirm");
        }

        User user = order.getUser();
        int days = switch (order.getPlan()) {
            case MONTHLY -> 30;
            case QUARTERLY -> 90;
            case YEARLY -> 365;
        };

        user.setPlan("premium");
        user.setPremiumExpiresAt(LocalDateTime.now().plusDays(days));
        order.setStatus(PaymentStatus.PAID);
        order.setConfirmedAt(LocalDateTime.now());

        userRepository.save(user);
        paymentRepository.save(order);

        notificationService.savePaymentNotification(
                user.getId(),
                "🎉 Tài khoản đã được nâng cấp Premium!",
                String.format("Thanh toán của bạn đã được xác nhận. Tài khoản Premium có hiệu lực đến %s.",
                        user.getPremiumExpiresAt().toLocalDate()));
    }

    @Transactional
    public void rejectPayment(UUID orderId) {
        PaymentOrder order = paymentRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment order not found"));

        if (order.getStatus() != PaymentStatus.PENDING_CONFIRM) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment not ready to reject");
        }

        order.setStatus(PaymentStatus.REJECTED);
        order.setConfirmedAt(LocalDateTime.now());
        paymentRepository.save(order);

        notificationService.savePaymentNotification(
                order.getUser().getId(),
                "❌ Yêu cầu thanh toán bị từ chối",
                "Thanh toán của bạn không được xác nhận. Vui lòng liên hệ admin để biết thêm chi tiết.");
    }

    private PaymentOrderResponse toResponse(PaymentOrder o) {
        return PaymentOrderResponse.builder()
                .id(o.getId())
                .userId(o.getUser().getId())
                .userEmail(o.getUser().getEmail())
                .plan(o.getPlan().name())
                .method(o.getMethod().name())
                .amount(o.getAmount())
                .transferCode(o.getTransferCode())
                .status(o.getStatus().name())
                .proofImage(o.getProofImage())
                .createdAt(o.getCreatedAt())
                .submittedAt(o.getSubmittedAt())
                .confirmedAt(o.getConfirmedAt())
                .build();
    }

    private String generateCode() {
        return "PHK_" + System.currentTimeMillis();
    }
}
