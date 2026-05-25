package com.pricehawl.controller;

import com.pricehawl.dto.PaymentOrderDTO;
import com.pricehawl.entity.PaymentOrder;
import com.pricehawl.entity.enums.PaymentStatus;
import com.pricehawl.service.PaymentOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentOrderController {

    private final PaymentOrderService paymentOrderService;

    // =========================
    // USER CREATE PAYMENT ORDER
    // =========================
    @PostMapping("/create/{userId}")
    public ResponseEntity<PaymentOrder> createOrder(
            @PathVariable UUID userId,
            @RequestBody PaymentOrderDTO req
    ) {
        return ResponseEntity.ok(
                paymentOrderService.createOrder(
                        userId,
                        req
                )
        );
    }

    // =========================
    // USER MARK SUBMITTED
    // "Tôi đã thanh toán"
    // =========================
    @PostMapping("/{id}/mark-submitted")
    public ResponseEntity<Void> markSubmitted(
            @PathVariable UUID id
    ) {
        paymentOrderService.markSubmitted(id);
        return ResponseEntity.ok().build();
    }

    // =========================
    // USER CHECK PAYMENT STATUS
    // =========================
    @GetMapping("/{id}/status")
    public ResponseEntity<PaymentStatus> getStatus(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                paymentOrderService.getStatus(id)
        );
    }

    // =========================
    // ADMIN CONFIRM PAYMENT
    // =========================
    @PostMapping("/admin/{id}/confirm")
    public ResponseEntity<Void> confirmPayment(
            @PathVariable UUID id
    ) {
        paymentOrderService.confirmPayment(id);
        return ResponseEntity.ok().build();
    }

    // =========================
    // ADMIN REJECT PAYMENT
    // =========================
    @PostMapping("/admin/{id}/reject")
    public ResponseEntity<Void> rejectPayment(
            @PathVariable UUID id
    ) {
        paymentOrderService.rejectPayment(id);
        return ResponseEntity.ok().build();
    }
}