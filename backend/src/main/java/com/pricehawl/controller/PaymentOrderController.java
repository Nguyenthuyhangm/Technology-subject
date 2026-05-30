package com.pricehawl.controller;

import com.pricehawl.dto.PaymentOrderDTO;
import com.pricehawl.dto.PaymentOrderResponse;
import com.pricehawl.entity.PaymentOrder;
import com.pricehawl.entity.enums.PaymentStatus;
import com.pricehawl.security.UserPrincipal;
import com.pricehawl.service.PaymentOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentOrderController {

    private static final Set<String> ADMIN_EMAILS = Set.of(
        "lethituphuong151020055@gmail.com",
        "trangdinhhuyen269@gmail.com",
        "23020661@vnu.edu.vn",
        "moimoicutenhut@gmail.com",
        "dminhanh2810@gmail.com"
    );

    private final PaymentOrderService paymentOrderService;

    private void requireAdmin(Authentication auth) {
        Object principal = auth.getPrincipal();
        String email = (principal instanceof UserPrincipal up) ? up.getEmail() : "";
        if (!ADMIN_EMAILS.contains(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
    }

    @PostMapping("/create")
    public ResponseEntity<PaymentOrder> createOrder(Authentication auth, @RequestBody PaymentOrderDTO req) {
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(paymentOrderService.createOrder(userId, req));
    }

    @PostMapping("/{id}/mark-submitted")
    public ResponseEntity<Void> markSubmitted(@PathVariable UUID id) {
        paymentOrderService.markSubmitted(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<PaymentStatus> getStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentOrderService.getStatus(id));
    }

    @GetMapping("/my-pending")
    public ResponseEntity<Map<String, Boolean>> myPending(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(Map.of("hasPending", paymentOrderService.hasPendingOrder(userId)));
    }

    // ── Admin endpoints ────────────────────────────────────────────────────────

    @GetMapping("/admin/pending")
    public ResponseEntity<List<PaymentOrderResponse>> getPendingOrders(Authentication auth) {
        requireAdmin(auth);
        return ResponseEntity.ok(paymentOrderService.getPendingOrders());
    }

    @GetMapping("/admin/pending-count")
    public ResponseEntity<Map<String, Long>> getPendingCount(Authentication auth) {
        requireAdmin(auth);
        return ResponseEntity.ok(Map.of("count", paymentOrderService.getPendingCount()));
    }

    @PostMapping("/admin/{id}/confirm")
    public ResponseEntity<Void> confirmPayment(Authentication auth, @PathVariable UUID id) {
        requireAdmin(auth);
        paymentOrderService.confirmPayment(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/admin/{id}/reject")
    public ResponseEntity<Void> rejectPayment(Authentication auth, @PathVariable UUID id) {
        requireAdmin(auth);
        paymentOrderService.rejectPayment(id);
        return ResponseEntity.ok().build();
    }
}
