package com.pricehawl.controller;

import com.pricehawl.service.OnDemandCrawlService;
import com.pricehawl.service.model.OnDemandCrawlJobDTO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller cho on-demand crawl.
 *
 * THAY THẾ file CrawlAdminController.java rỗng hiện tại.
 *
 * Endpoints:
 *   POST /api/crawl/on-demand   — Extension trigger crawl
 *   GET  /api/crawl/jobs/{jobId} — Extension polling job status
 */
@Slf4j
@RestController
@RequestMapping("/api/crawl")
@RequiredArgsConstructor
public class CrawlAdminController {

    private final OnDemandCrawlService onDemandCrawlService;

    // ================================================================
    // POST /api/crawl/on-demand
    // ================================================================

    /**
     * Extension gọi endpoint này khi không tìm được sản phẩm trong DB.
     *
     * Request body:
     * {
     *   "productName":    "Kem chống nắng Anessa Perfect UV SPF50+",
     *   "sourceUrl":      "https://shopee.vn/...",
     *   "sourcePlatform": "shopee"
     * }
     *
     * Response 202:
     * { "jobId": "uuid", "message": "..." }
     *
     * Response 429:
     * { "error": "Rate limit exceeded" }
     *
     * Response 400:
     * { "error": "productName is required" }
     */
    @PostMapping("/on-demand")
    public ResponseEntity<Map<String, Object>> triggerOnDemand(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            HttpServletRequest request) {

        // Validate input
        String productName = body.get("productName");
        if (productName == null || productName.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "productName is required"));
        }

        String sourceUrl      = body.getOrDefault("sourceUrl", "");
        String sourcePlatform = body.getOrDefault("sourcePlatform", "unknown");

        // Rate limit: dùng userId nếu có, fallback về IP
        String rateLimitKey = (userId != null && !userId.isBlank())
            ? "user:" + userId
            : "ip:" + getClientIp(request);

        if (onDemandCrawlService.isRateLimited(rateLimitKey)) {
            log.warn("Rate limited | key={} | product='{}'", rateLimitKey, productName);
            return ResponseEntity.status(429)
                .body(Map.of("error",
                    "Bạn đã tìm kiếm quá 3 lần trong 1 giờ. Vui lòng thử lại sau."));
        }

        // Trigger job — trả về jobId ngay, async chạy ngầm
        String jobId = onDemandCrawlService.trigger(
            productName.trim(),
            sourceUrl,
            sourcePlatform,
            userId
        );

        log.info("On-demand crawl triggered | jobId={} | product='{}' | userId={}",
            jobId, productName, userId);

        return ResponseEntity.accepted()
            .body(Map.of(
                "jobId",   jobId,
                "message", "Đang tìm kiếm \"" + productName +
                           "\" trên các sàn, vui lòng chờ khoảng 30–60 giây..."
            ));
    }

    // ================================================================
    // GET /api/crawl/jobs/{jobId}
    // ================================================================

    /**
     * Extension polling mỗi 5 giây để kiểm tra trạng thái job.
     *
     * Response 200 (job đang chạy):
     * {
     *   "jobId": "...",
     *   "status": "RUNNING",
     *   "productId": null,
     *   "platformsFound": 3,
     *   "triggeredAt": "2024-01-15T10:30:00Z"
     * }
     *
     * Response 200 (job xong):
     * {
     *   "jobId": "...",
     *   "status": "DONE",
     *   "productId": "uuid-của-product",
     *   "platformsFound": 4,
     *   "finishedAt": "2024-01-15T10:30:45Z"
     * }
     *
     * Response 404 (job không tồn tại hoặc đã hết TTL 30 phút):
     * { "error": "Job not found or expired" }
     */
    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<?> getJobStatus(@PathVariable String jobId) {
        OnDemandCrawlJobDTO job = onDemandCrawlService.getJobStatus(jobId);

        if (job == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(job);
    }

    // ================================================================
    // HELPER
    // ================================================================

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}