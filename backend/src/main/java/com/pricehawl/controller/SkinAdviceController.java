package com.pricehawl.controller;

import com.pricehawl.dto.SkinAdviceRequest;
import com.pricehawl.dto.SkinAdviceResponse;
import com.pricehawl.service.SkinAdvicePdfService;
import com.pricehawl.service.SkinAdviceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/skin-advice")
@RequiredArgsConstructor
public class SkinAdviceController {

    private final SkinAdviceService skinAdviceService;
    private final SkinAdvicePdfService skinAdvicePdfService;

    @PostMapping
    public ResponseEntity<SkinAdviceResponse> analyzeOrGet(
            @RequestBody SkinAdviceRequest request
    ) {
        return ResponseEntity.ok(skinAdviceService.analyzeOrGet(request));
    }

    @GetMapping("/{reportId}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable UUID reportId) {
        return skinAdvicePdfService.downloadPdf(reportId);
    }
}