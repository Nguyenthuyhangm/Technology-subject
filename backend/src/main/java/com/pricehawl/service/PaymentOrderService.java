package com.pricehawl.service;

import com.pricehawl.dto.PaymentOrderDTO;
import com.pricehawl.entity.PaymentOrder;
import com.pricehawl.entity.User;
import com.pricehawl.entity.enums.PaymentStatus;
import com.pricehawl.repository.PaymentRepository;
import com.pricehawl.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentOrderService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    @Transactional
    public PaymentOrder createOrder(
            UUID userId,
            PaymentOrderDTO req
    ) {
        User user = userRepository
                .findById(userId)
                .orElseThrow();

        int amount = switch (req.getPlan()) {
            case MONTHLY -> 29000;
            case QUARTERLY -> 99000;
            case YEARLY -> 359000;
        };

        PaymentOrder order =
                PaymentOrder.builder()
                        .user(user)
                        .plan(req.getPlan())
                        .method(req.getMethod())
                        .amount(amount)
                        .transferCode(generateCode())
                        .status(PaymentStatus.PENDING)
                        .build();

        return paymentRepository.save(order);
    }
    // =========================
// USER CHECK STATUS
// =========================
    @Transactional(readOnly = true)
    public PaymentStatus getStatus(
            UUID orderId
    ) {
        PaymentOrder order =
                paymentRepository
                        .findById(orderId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Payment order not found"
                                )
                        );

        return order.getStatus();
    }

    // =========================
// ADMIN CONFIRM PAYMENT
// =========================
    @Transactional
    public void confirmPayment(
            UUID orderId
    ) {
        PaymentOrder order =
                paymentRepository
                        .findById(orderId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Payment order not found"
                                )
                        );

        if (order.getStatus()
                != PaymentStatus.PENDING_CONFIRM) {
            throw new RuntimeException(
                    "Payment not ready to confirm"
            );
        }

        User user = order.getUser();

        int days = switch (order.getPlan()) {
            case MONTHLY -> 30;
            case QUARTERLY -> 90;
            case YEARLY -> 365;
        };

        // FREE -> PREMIUM
        user.setPlan("premium");

        user.setPremiumExpiresAt(
                LocalDateTime.now()
                        .plusDays(days)
        );

        order.setStatus(
                PaymentStatus.PAID
        );

        order.setConfirmedAt(
                LocalDateTime.now()
        );

        userRepository.save(user);
        paymentRepository.save(order);
    }

    // =========================
// ADMIN REJECT PAYMENT
// =========================
    @Transactional
    public void rejectPayment(
            UUID orderId
    ) {
        PaymentOrder order =
                paymentRepository
                        .findById(orderId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Payment order not found"
                                )
                        );

        if (order.getStatus()
                != PaymentStatus.PENDING_CONFIRM) {
            throw new RuntimeException(
                    "Payment not ready to reject"
            );
        }

        order.setStatus(
                PaymentStatus.REJECTED
        );

        order.setConfirmedAt(
                LocalDateTime.now()
        );

        paymentRepository.save(order);
    }
    @Transactional
    public void markSubmitted(UUID orderId) {
        PaymentOrder order =
                paymentRepository
                        .findById(orderId)
                        .orElseThrow();

        if (order.getStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException(
                    "Invalid payment state"
            );
        }

        order.setStatus(
                PaymentStatus.PENDING_CONFIRM
        );

        order.setSubmittedAt(
                LocalDateTime.now()
        );
    }

    private String generateCode() {
        return "PHK_" +
                System.currentTimeMillis();
    }
}