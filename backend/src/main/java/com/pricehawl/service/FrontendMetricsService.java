package com.pricehawl.service;

import com.pricehawl.dto.FrontendMetricsRequest;
import io.micrometer.core.instrument.*;
import org.springframework.stereotype.Service;
import java.time.Duration;

@Service
public class FrontendMetricsService {

    private final Counter apiRequestsCounter;
    private final Counter apiErrorsCounter;
    private final Counter jsErrorsCounter;
    private final Timer pageLoadTimer;

    public FrontendMetricsService(MeterRegistry registry) {
        apiRequestsCounter = Counter.builder("frontend_api_requests_total")
                .register(registry);
        apiErrorsCounter = Counter.builder("frontend_api_errors_total")
                .register(registry);
        jsErrorsCounter = Counter.builder("frontend_js_errors_total")
                .register(registry);
        pageLoadTimer = Timer.builder("frontend_page_load_seconds")
                .publishPercentileHistogram(true)
                .minimumExpectedValue(Duration.ofMillis(100))
                .maximumExpectedValue(Duration.ofSeconds(30))
                .register(registry);
    }

    public void record(FrontendMetricsRequest req) {
        apiRequestsCounter.increment(req.apiRequests());
        apiErrorsCounter.increment(req.apiErrors());
        jsErrorsCounter.increment(req.jsErrors());
        if (req.pageLoadSeconds() != null && req.pageLoadSeconds() > 0) {
            pageLoadTimer.record(Duration.ofMillis((long)(req.pageLoadSeconds() * 1000)));
        }
    }
}
