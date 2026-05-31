package com.pricehawl.service;

import com.pricehawl.entity.AffiliateClick;
import com.pricehawl.repository.AffiliateClickRepository;
import com.pricehawl.repository.ProductListingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AffiliateService {

    private static final String PUBLISHER_ID = "6964549063767105843";

    private static final java.util.Map<String, String> CAMPAIGN_IDS = java.util.Map.of(
        "watsons", "5701062214502283005",
        "tiki",    "4348614231480407268"
    );

    // Bot user agents cần filter
    private static final java.util.List<String> BOT_AGENTS = java.util.List.of(
        "googlebot", "bingbot", "yandex", "baiduspider", "facebookexternalhit"
    );

    private final AffiliateClickRepository clickRepository;
    private final ProductListingRepository listingRepository;
    private final StringRedisTemplate redisTemplate;

    /**
     * Xử lý click affiliate:
     * 1. Kiểm tra bot
     * 2. Chống spam (Redis)
     * 3. Lưu click async
     * 4. Trả về affiliate URL để redirect
     */
    public String processClick(UUID productId, String platform,
                               String userId, String ip, String userAgent) {

        // Rule 3 — Filter bot
        if (isBot(userAgent)) {
            log.debug("Bot detected, skipping: {}", userAgent);
            return buildAffiliateUrl(productId, platform, null);
        }

        String clickId = UUID.randomUUID().toString();

        // Rule 1 — Cùng IP + product trong 5 phút → chỉ tính 1 click
        String spamKey1 = "aff:spam1:" + ip + ":" + productId;
        Boolean firstClick = redisTemplate.opsForValue()
            .setIfAbsent(spamKey1, clickId, 5, TimeUnit.MINUTES);

        // Rule 2 — Cùng IP vượt 10 click/phút → nghi bot
        String spamKey2 = "aff:spam2:" + ip;
        Long clickCount = redisTemplate.opsForValue().increment(spamKey2);
        if (clickCount != null && clickCount == 1) {
            redisTemplate.expire(spamKey2, 1, TimeUnit.MINUTES);
        }
        boolean suspicious = clickCount != null && clickCount > 10;

        if (Boolean.TRUE.equals(firstClick) && !suspicious) {
            // Click hợp lệ — lưu async không block redirect
            UUID userUuid = null;
            try { userUuid = userId != null ? UUID.fromString(userId) : null; } catch (Exception ignored) {}
            saveClickAsync(userUuid, productId, platform, clickId, ip, userAgent);
        } else {
            log.debug("Spam click filtered: ip={}, product={}, count={}", ip, productId, clickCount);
            // Vẫn redirect nhưng không tăng số đếm
        }

        return buildAffiliateUrl(productId, platform, clickId);
    }

    @Async
    public void saveClickAsync(UUID userId, UUID productId, String platform,
                               String clickId, String ip, String userAgent) {
        try {
            AffiliateClick click = AffiliateClick.builder()
                .userId(userId)
                .productId(productId)
                .platform(platform)
                .clickId(clickId)
                .ip(ip)
                .userAgent(userAgent != null && userAgent.length() > 255
                    ? userAgent.substring(0, 255) : userAgent)
                .build();
            clickRepository.save(click);
        } catch (Exception e) {
            log.error("Failed to save affiliate click: {}", e.getMessage());
        }
    }

    private String buildAffiliateUrl(UUID productId, String platform, String clickId) {
        // Lấy URL gốc từ DB
        String productUrl = listingRepository
            .findByProductIdAndPlatformNameIgnoreCase(productId, platform)
            .stream()
            .findFirst()
            .map(l -> l.getUrl())
            .orElse(null);

        if (productUrl == null) {
            log.warn("No listing found for productId={}, platform={}", productId, platform);
            return "https://pricehawk.vn";
        }

        String platformKey = platform.toLowerCase();
        String campaignId = CAMPAIGN_IDS.get(platformKey);

        // Sàn không có affiliate → link gốc
        if (campaignId == null) return productUrl;

        String encoded = Base64.getEncoder().encodeToString(productUrl.getBytes())
            .replace("+", "%2B")
            .replace("=", "%3D")
            .replace("/", "%2F");

        String url = String.format(
            "https://go.isclix.com/deep_link/v5/%s/%s?sub4=pricehawk&url_enc=%s",
            PUBLISHER_ID, campaignId, encoded
        );

        if (clickId != null) {
            url += "&sub1=" + clickId;
        }

        return url;
    }

    private boolean isBot(String userAgent) {
        if (userAgent == null) return false;
        String lower = userAgent.toLowerCase();
        return BOT_AGENTS.stream().anyMatch(lower::contains);
    }
}