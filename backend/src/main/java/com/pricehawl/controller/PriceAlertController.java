package com.pricehawl.controller;

import com.pricehawl.dto.CreatePriceAlertRequest;
import com.pricehawl.dto.PriceAlertResponse;
import com.pricehawl.service.PriceAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PriceAlertController {

    private final PriceAlertService priceAlertService;

    @PostMapping
    public ResponseEntity<PriceAlertResponse> createAlert(@RequestBody CreatePriceAlertRequest request) {
        return ResponseEntity.ok(priceAlertService.createAlert(request));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PriceAlertResponse>> getAlertsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(priceAlertService.getAlertsByUser(userId));
    }

    @PatchMapping("/{alertId}/toggle")
    public ResponseEntity<PriceAlertResponse> toggleAlert(@PathVariable UUID alertId) {
        return ResponseEntity.ok(priceAlertService.toggleAlert(alertId));
    }

    @DeleteMapping("/{alertId}")
    public ResponseEntity<Void> deleteAlert(@PathVariable UUID alertId) {
        priceAlertService.deleteAlert(alertId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/check/product/{productId}")
    public ResponseEntity<Void> checkAlertsForProduct(@PathVariable UUID productId) {
        priceAlertService.checkAlertsForProduct(productId);
        return ResponseEntity.ok().build();
    }
}