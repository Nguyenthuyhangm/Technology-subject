package com.pricehawl.controller;

import com.pricehawl.dto.PriceAlertRequest;
import com.pricehawl.dto.PriceAlertResponse;
import com.pricehawl.security.UserPrincipal;
import com.pricehawl.service.PriceAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PriceAlertController {

    private final PriceAlertService alertService;

    @GetMapping
    public ResponseEntity<List<PriceAlertResponse>> getMyAlerts(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(alertService.getByUser(principal.getUserId()));
    }

    @PostMapping
    public ResponseEntity<PriceAlertResponse> create(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestBody PriceAlertRequest req
    ) {
        return ResponseEntity.ok(alertService.create(principal.getUserId(), req));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<PriceAlertResponse> toggle(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable UUID id
    ) {
        return ResponseEntity.ok(alertService.toggleActive(id, principal.getUserId()));
    }

    @PatchMapping("/{id}/price")
    public ResponseEntity<PriceAlertResponse> updatePrice(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable UUID id,
        @RequestBody Map<String, Integer> body
    ) {
        return ResponseEntity.ok(
            alertService.updateTargetPrice(id, principal.getUserId(), body.get("targetPrice"))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable UUID id
    ) {
        alertService.delete(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    // CHỈ DÙNG ĐỂ TEST — xóa sau khi demo
@PostMapping("/test-trigger/{productId}/{price}")
public ResponseEntity<String> testTrigger(
    @PathVariable UUID productId,
    @PathVariable int price
) {
    alertService.checkAndTrigger(productId, price);
    return ResponseEntity.ok("Triggered!");
}
}