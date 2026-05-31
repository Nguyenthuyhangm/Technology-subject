package com.pricehawl.service.crawler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;

/**
 * Rate limiter cho crawler dùng Redis atomic increment.
 *
 * Mỗi platform có ngưỡng riêng (requests/phút).
 * Khi vượt ngưỡng → thread sleep đến hết window rồi tiếp tục.
 *
 * Dùng Redis vì atomic increment → nhiều thread không bị race condition.
 */
@Component
public class CrawlerRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(CrawlerRateLimiter.class);

    // Giới hạn requests mỗi phút cho từng platform
    private static final Map<String, Integer> PLATFORM_LIMITS = Map.of(
        "tiki",     10,   // Tiki API khá thoải mái
        "hasaki",    5,   // Hasaki vừa phải
        "guardian",  5,   // Guardian vừa phải
        "cocolux",   3,   // Cocolux chặt hơn
        "watsons",   2    // Watsons chặt nhất (Puppeteer chậm)
    );

    private static final int DEFAULT_LIMIT = 5;
    private static final int WINDOW_SECONDS = 60;

    private final StringRedisTemplate redisTemplate;

    public CrawlerRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Gọi trước khi crawl.
     * Nếu vượt ngưỡng → sleep đến hết window rồi mới return.
     */
    public void acquire(String platform) {
        String key = "crawler:rate:" + platform.toLowerCase();
        int limit = PLATFORM_LIMITS.getOrDefault(platform.toLowerCase(), DEFAULT_LIMIT);

        try {
            // Atomic increment
            Long count = redisTemplate.opsForValue().increment(key);

            // Lần đầu trong window → set TTL 60 giây
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofSeconds(WINDOW_SECONDS));
            }

            log.debug("Rate limit | platform={} | count={}/{}", platform, count, limit);

            // Vượt ngưỡng → tính thời gian còn lại và sleep
            if (count != null && count > limit) {
                Long ttl = redisTemplate.getExpire(key);
                long sleepMs = (ttl != null && ttl > 0) ? ttl * 1000L : WINDOW_SECONDS * 1000L;

                log.info("Rate limit reached | platform={} | count={}/{} | sleeping {}ms",
                        platform, count, limit, sleepMs);

                Thread.sleep(sleepMs);

                // Reset counter sau khi hết window
                redisTemplate.delete(key);
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Rate limiter interrupted for platform={}", platform);
        } catch (Exception e) {
            // Redis lỗi → bỏ qua rate limit, crawl bình thường
            log.warn("Rate limiter error for platform={}: {} → skipping", platform, e.getMessage());
        }
    }
}