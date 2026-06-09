package com.pricehawl.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricehawl.service.crawler.PlatformPriceCrawler;
import com.pricehawl.service.model.OnDemandCrawlJobDTO;
import com.pricehawl.service.model.PriceSnapshotDTO;
import com.pricehawl.service.model.SearchResultItem;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.text.Normalizer;

/**
 * Orchestrator — điều phối toàn bộ flow on-demand crawl.
 *
 * FLOW:
 *   trigger() [sync]
 *       → clean tên, rút gọn query
 *       → tạo job Redis
 *       → kick @Async
 *
 *   executeJobAsync() [@Async]
 *       → searchAllPlatforms(searchQuery) — Tiki API + DuckDuckGo cho 4 sàn còn lại
 *       → enrichWithDetailCrawl() — dùng crawler cũ crawl URL tìm được → giá + ảnh
 *       → importToDb() — lưu product + listing + price_record
 *       → indexProductById() — index Elasticsearch
 *       → saveCrawlCompleteNotification() — notify user
 *       → update Redis DONE
 *
 *   getJobStatus() [sync] — extension polling mỗi 5 giây
 */
@Slf4j
@Service
public class OnDemandCrawlService {

    private final StringRedisTemplate   redisTemplate;
    private final ObjectMapper          objectMapper;
    private final OnDemandSearchService searchService;
    private final OnDemandImportService importService;
    private final ProductSearchService  productSearchService;
    private final NotificationService   notificationService;
    private final Map<String, PlatformPriceCrawler> crawlerMap;

    private static final String KEY_PREFIX  = "crawl_job:";
    private static final long   TTL_MINUTES = 30L;

    public OnDemandCrawlService(
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            OnDemandSearchService searchService,
            OnDemandImportService importService,
            ProductSearchService productSearchService,
            NotificationService notificationService,
            List<PlatformPriceCrawler> crawlers) {

        this.redisTemplate       = redisTemplate;
        this.objectMapper        = objectMapper;
        this.searchService       = searchService;
        this.importService       = importService;
        this.productSearchService = productSearchService;
        this.notificationService  = notificationService;

        // Build crawler map từ list — tái sử dụng crawler cũ
        Map<String, PlatformPriceCrawler> map = new HashMap<>();
        for (PlatformPriceCrawler c : crawlers) {
            map.put(c.platformName().toLowerCase(), c);
        }
        this.crawlerMap = Collections.unmodifiableMap(map);
        log.info("OnDemandCrawlService initialized with crawlers: {}", map.keySet());
    }

    // ================================================================
    // 1. TRIGGER — sync, trả về jobId ngay
    // ================================================================

    public String trigger(String productName, String sourceUrl,
                          String sourcePlatform, String userId) {

        // Clean ký tự đặc biệt
        productName = productName.replaceAll("[#@&*]", "").replaceAll("\\s+", " ").trim();

        // Rút gọn query để search hiệu quả hơn:
        // "Sữa Rửa Mặt CeraVe - Màu Sắc Xanh Lá 236ml" → "Sữa Rửa Mặt CeraVe"
        String searchQuery = buildSearchQuery(productName);

        String jobId = UUID.randomUUID().toString();

        OnDemandCrawlJobDTO job = OnDemandCrawlJobDTO.builder()
            .jobId(jobId)
            .userId(userId)
            .productName(productName)   // tên đầy đủ — dùng để import
            .sourcePlatform(sourcePlatform)
            .sourceUrl(sourceUrl)
            .status("PENDING")
            .triggeredAt(Instant.now().toString())
            .platformsFound(0)
            .build();

        // Lưu searchQuery vào sourceUrl tạm (tái dùng field) — hoặc thêm field mới vào DTO
        // Cách đơn giản: lưu vào errorMessage tạm rồi clear sau
        // Tốt hơn: thêm field searchQuery vào OnDemandCrawlJobDTO
        // Ở đây mình dùng cách truyền thẳng vào executeJobAsync
        saveToRedis(jobId, job);

        log.info("Triggered | jobId={} | product='{}' | query='{}'",
            jobId, productName, searchQuery);

        executeJobAsync(jobId, job, searchQuery);
        return jobId;
    }

    // ================================================================
    // 2. EXECUTE — @Async, chạy ngầm
    // ================================================================

    @Async("onDemandCrawlExecutor")
public void executeJobAsync(String jobId, OnDemandCrawlJobDTO job, String searchQuery) {
    try {
        updateStatus(jobId, "RUNNING", null, null, 0);

        // ── Bước 1: Search tìm URL trên 5 sàn ──
        log.info("Job {} — searching for '{}'", jobId, searchQuery);
        Map<String, List<SearchResultItem>> allResults =
            searchService.searchAllPlatforms(searchQuery);

        int platformsFound = (int) allResults.values().stream()
            .filter(l -> !l.isEmpty()).count();

        if (platformsFound == 0) {
            updateStatus(jobId, "FAILED", null,
                "Không tìm được sản phẩm trên bất kỳ sàn nào.", 0);
            return;
        }

        updateStatus(jobId, "RUNNING", null, null, platformsFound);

        // ── Bước 2: Crawl chi tiết từng URL → lấy giá + ảnh chính xác ──
        log.info("Job {} — enriching {} URLs with detail crawl", jobId, platformsFound);
        List<SearchResultItem> enriched = new ArrayList<>(enrichWithDetailCrawl(allResults));

        // ── THÊM: Crawl sourceUrl nếu platform chưa có trong enriched ──
        if (job.getSourceUrl() != null && !job.getSourceUrl().isBlank()) {
            String sourcePlatform = job.getSourcePlatform().toLowerCase();
            boolean alreadyHasSource = enriched.stream()
                .anyMatch(i -> i.getPlatform().equalsIgnoreCase(sourcePlatform));

            if (!alreadyHasSource) {
                PlatformPriceCrawler crawler = crawlerMap.get(sourcePlatform);
                if (crawler != null) {
                    try {
                        log.info("Job {} — crawling sourceUrl | platform={} | url={}",
                            jobId, sourcePlatform, job.getSourceUrl());
                        PriceSnapshotDTO snapshot = crawler.crawl(job.getSourceUrl());
                        if (snapshot.getPrice() != null && snapshot.getPrice() > 0) {
                            enriched.add(SearchResultItem.builder()
                                .platform(sourcePlatform)
                                .url(job.getSourceUrl())
                                .price(snapshot.getPrice())
                                .originalPrice(snapshot.getOriginalPrice())
                                .name(job.getProductName())
                                .brand(null)
                                .build());
                            log.info("Job {} — sourceUrl crawled OK | price={}",
                                jobId, snapshot.getPrice());
                        }
                    } catch (Exception e) {
                        log.warn("Job {} — sourceUrl crawl failed (non-fatal): {}",
                            jobId, e.getMessage());
                    }
                }
            }
        }

        if (enriched.isEmpty()) {
            updateStatus(jobId, "FAILED", null,
                "Tìm được URL nhưng không crawl được giá. Thử lại sau.", platformsFound);
            return;
        }

        // ── Bước 3: Import DB ──
        log.info("Job {} — importing {} listings", jobId, enriched.size());
        UUID productId = importService.importToDb(job.getProductName(), enriched);

        // ── Bước 4: Index Elasticsearch ──
        try {
            productSearchService.indexProductById(productId);
        } catch (Exception e) {
            log.warn("Job {} — ES index failed (non-fatal): {}", jobId, e.getMessage());
        }

        // ── Bước 5: Notify user ──
        if (job.getUserId() != null && !job.getUserId().isBlank()) {
            try {
                notificationService.saveCrawlCompleteNotification(
                    UUID.fromString(job.getUserId()),
                    job.getProductName(),
                    productId
                );
            } catch (Exception e) {
                log.warn("Job {} — notify failed (non-fatal): {}", jobId, e.getMessage());
            }
        }

        updateStatus(jobId, "DONE", productId.toString(), null, enriched.size());
        log.info("Job {} — DONE | productId={} | listings={}", jobId, productId, enriched.size());

    } catch (Exception e) {
        log.error("Job {} — FAILED: {}", jobId, e.getMessage(), e);
        updateStatus(jobId, "FAILED", null, e.getMessage(), 0);
    }
}

private List<SearchResultItem> enrichWithDetailCrawl(
        Map<String, List<SearchResultItem>> allResults) {

    List<SearchResultItem> enriched = new ArrayList<>();

    for (Map.Entry<String, List<SearchResultItem>> entry : allResults.entrySet()) {
        String platform = entry.getKey();
        List<SearchResultItem> items = entry.getValue();

        if (items.isEmpty()) continue;
        SearchResultItem item = items.get(0);

        if ("tiki".equals(platform) && item.getPrice() != null) {
            log.info("Tiki — using API price | price={} | url={}", item.getPrice(), item.getUrl());
            enriched.add(item);
            continue;
        }

        PlatformPriceCrawler crawler = crawlerMap.get(platform);
        if (crawler == null) {
            log.warn("No crawler for platform={}", platform);
            continue;
        }

        try {
            log.info("Crawling detail | platform={} | url={}", platform, item.getUrl());
            PriceSnapshotDTO snapshot = crawler.crawl(item.getUrl());

            if (snapshot.getPrice() == null || snapshot.getPrice() <= 0) {
                log.warn("Detail crawl returned null price | platform={}", platform);
                continue;
            }

            item.setPrice(snapshot.getPrice());
            item.setOriginalPrice(snapshot.getOriginalPrice());

            log.info("Detail crawl OK | platform={} | price={}", platform, snapshot.getPrice());
            enriched.add(item);

        } catch (Exception e) {
            log.warn("Detail crawl failed | platform={} | url={} | error={}",
                platform, item.getUrl(), e.getMessage());
        }
    }

    return enriched;
}

    // ================================================================
    // CRAWL CHI TIẾT — dùng lại crawler cũ (HasakiPriceCrawler, etc.)
    // ================================================================

    /**
     * Với mỗi SearchResultItem có URL, dùng PlatformPriceCrawler.crawl(url)
     * để lấy giá chính xác, discount%, inStock, và ảnh từ trang chi tiết.
     *
     * Tiki đã có giá từ API → chỉ cần crawl Hasaki/Guardian/Cocolux/Watsons.
     */
    
    // ================================================================
    // 3. GET STATUS — extension polling
    // ================================================================

    public OnDemandCrawlJobDTO getJobStatus(String jobId) {
        String json = redisTemplate.opsForValue().get(KEY_PREFIX + jobId);
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, OnDemandCrawlJobDTO.class);
        } catch (Exception e) {
            log.warn("Deserialize job {} failed: {}", jobId, e.getMessage());
            return null;
        }
    }

    // ================================================================
    // RATE LIMIT
    // ================================================================

    public boolean isRateLimited(String rateLimitKey) {
        String key = "crawl_rate:" + rateLimitKey;
        String val = redisTemplate.opsForValue().get(key);
        int count  = val != null ? Integer.parseInt(val) : 0;
        if (count >= 10) return true; // 10 lần/giờ — thoải mái cho dev
        redisTemplate.opsForValue().increment(key);
        if (count == 0) redisTemplate.expire(key, Duration.ofHours(1));
        return false;
    }

    // ================================================================
    // HELPERS
    // ================================================================

    /**
     * Rút gọn tên sản phẩm để search hiệu quả hơn.
     *
     * "Sữa Rửa Mặt CeraVe - Màu Sắc Xanh Lá Hydrating 236ml"
     * → bỏ sau dấu - → "Sữa Rửa Mặt CeraVe"
     *
     * "Son Kem 3ce Hazy Lip Clay Warm Brownie"
     * → 5 từ đầu → "Son Kem 3ce Hazy Lip"
     */
   private String buildSearchQuery(String productName) {
    // Bỏ dấu tiếng Việt
    String normalized = Normalizer.normalize(productName, Normalizer.Form.NFD);
    return normalized
        .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
        .replace("đ", "d")
        .replace("Đ", "D")
        .replaceAll("[#@&*]", "")
        .replaceAll("\\s+", " ")
        .trim();
}

    private void updateStatus(String jobId, String status, String productId,
                               String errorMessage, int platformsFound) {
        try {
            String key  = KEY_PREFIX + jobId;
            String json = redisTemplate.opsForValue().get(key);
            if (json == null) return;

            OnDemandCrawlJobDTO job = objectMapper.readValue(json, OnDemandCrawlJobDTO.class);
            job.setStatus(status);
            job.setPlatformsFound(platformsFound);
            if (productId != null)    job.setProductId(productId);
            if (errorMessage != null) job.setErrorMessage(
                errorMessage.length() > 500 ? errorMessage.substring(0, 500) : errorMessage);
            if ("DONE".equals(status) || "FAILED".equals(status))
                job.setFinishedAt(Instant.now().toString());

            Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
            long remain = (ttl != null && ttl > 0) ? ttl : TTL_MINUTES * 60;

            redisTemplate.opsForValue().set(
                key, objectMapper.writeValueAsString(job), Duration.ofSeconds(remain));

        } catch (Exception e) {
            log.warn("updateStatus failed for job {}: {}", jobId, e.getMessage());
        }
    }

    private void saveToRedis(String jobId, OnDemandCrawlJobDTO job) {
        try {
            redisTemplate.opsForValue().set(
                KEY_PREFIX + jobId,
                objectMapper.writeValueAsString(job),
                Duration.ofMinutes(TTL_MINUTES));
        } catch (Exception e) {
            throw new RuntimeException("Failed to save job to Redis: " + e.getMessage(), e);
        }
    }
}