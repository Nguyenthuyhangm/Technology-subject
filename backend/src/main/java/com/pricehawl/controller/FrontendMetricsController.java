package com.pricehawl.controller;

import com.pricehawl.dto.FrontendMetricsRequest;
import com.pricehawl.service.FrontendMetricsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/metrics")
public class FrontendMetricsController {

    private final FrontendMetricsService metricsService;

    public FrontendMetricsController(FrontendMetricsService metricsService) {
        this.metricsService = metricsService;
    }

    @PostMapping("/frontend")
    public ResponseEntity<Void> ingest(@RequestBody FrontendMetricsRequest req) {
        metricsService.record(req);
        return ResponseEntity.ok().build();
    }
}
