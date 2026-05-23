package com.pricehawl.service;

import com.pricehawl.dto.PriceAlertRequest;
import com.pricehawl.dto.PriceAlertResponse;
import com.pricehawl.entity.Notification;
import com.pricehawl.entity.PriceAlert;
import com.pricehawl.entity.Product;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.NotificationRepository;
import com.pricehawl.repository.PlatformRepository;
import com.pricehawl.repository.PriceAlertRepository;
import com.pricehawl.repository.ProductRepository;
import com.pricehawl.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceAlertService {

    private static final int FREE_PLAN_LIMIT = 5;

    private final PriceAlertRepository alertRepository;
    private final NotificationRepository notificationRepository;
    private final ProductRepository productRepository;
    private final PlatformRepository platformRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${resend.api-key}")
    private String resendApiKey;

    // ── CRUD ──────────────────────────────────────────────────────────────────

    @Transactional
    public PriceAlertResponse create(String userId, PriceAlertRequest req) {
        UUID userUuid = UUID.fromString(userId);

        Product product = productRepository.findById(req.getProductId())
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));

        // Nếu đã có alert cho sản phẩm này → update thay vì tạo mới
        Optional<PriceAlert> existing = alertRepository.findByUserIdAndProductId(userUuid, req.getProductId());
        if (existing.isPresent()) {
            PriceAlert alert = existing.get();
            alert.setTargetPrice(req.getTargetPrice());
            alert.setChannel(req.getChannel() != null ? req.getChannel() : alert.getChannel());
            alert.setActive(true);
            alertRepository.save(alert);
            log.info("Alert updated (upsert): alertId={}, productId={}", alert.getId(), req.getProductId());
            return toResponse(alert, product);
        }

        // Chưa có → check limit rồi tạo mới
        long count = alertRepository.countByUserIdAndIsActiveTrue(userUuid);
        if (count >= FREE_PLAN_LIMIT) {
            throw new IllegalStateException(
                "Bạn đã đạt giới hạn " + FREE_PLAN_LIMIT + " alert cho tài khoản free."
            );
        }

        PriceAlert alert = PriceAlert.builder()
            .userId(userUuid)
            .productId(req.getProductId())
            .platformId(req.getPlatformId())
            .targetPrice(req.getTargetPrice())
            .channel(req.getChannel() != null ? req.getChannel() : "email")
            .isActive(true)
            .build();

        alertRepository.save(alert);
        return toResponse(alert, product);
    }

    public List<PriceAlertResponse> getByUser(String userId) {
        UUID userUuid = UUID.fromString(userId);
        return alertRepository.findByUserIdOrderByCreatedAtDesc(userUuid)
            .stream()
            .map(alert -> {
                Product product = productRepository.findById(alert.getProductId()).orElse(null);
                return toResponse(alert, product);
            })
            .collect(Collectors.toList());
    }

    @Transactional
    public PriceAlertResponse toggleActive(UUID alertId, String userId) {
        PriceAlert alert = findAndVerify(alertId, userId);
        alert.setActive(!alert.isActive());
        alertRepository.save(alert);
        Product product = productRepository.findById(alert.getProductId()).orElse(null);
        return toResponse(alert, product);
    }

    @Transactional
    public PriceAlertResponse updateTargetPrice(UUID alertId, String userId, int newPrice) {
        PriceAlert alert = findAndVerify(alertId, userId);
        alert.setTargetPrice(newPrice);
        alertRepository.save(alert);
        Product product = productRepository.findById(alert.getProductId()).orElse(null);
        return toResponse(alert, product);
    }

    @Transactional
    public void delete(UUID alertId, String userId) {
        PriceAlert alert = findAndVerify(alertId, userId);
        notificationRepository.deleteByAlertId(alertId);
        alertRepository.delete(alert);
    }

    // ── TRIGGER ──────────────────────────────────────────────────────────────

    @Transactional
    public void checkAndTrigger(UUID productId, int currentPrice) {
        List<PriceAlert> triggerable = alertRepository.findTriggerable(productId, currentPrice);
        if (triggerable.isEmpty()) return;

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return;

        for (PriceAlert alert : triggerable) {
            try {
                if (alert.getNotifiedAt() != null &&
                    alert.getNotifiedAt().isAfter(LocalDateTime.now().minusHours(24))) {
                    continue;
                }

                Notification notification = Notification.builder()
                    .userId(alert.getUserId())
                    .alertId(alert.getId())
                    .productId(productId)
                    .title("🎉 Giá đã chạm ngưỡng!")
                    .message(String.format(
                        "%s hiện đang có giá %,d₫ — đúng mức bạn mong muốn!",
                        product.getName(), currentPrice))
                    .isRead(false)
                    .build();
                notificationRepository.save(notification);

                if ("email".equalsIgnoreCase(alert.getChannel())
                        || "all".equalsIgnoreCase(alert.getChannel())) {
                    String userEmail = userRepository.findById(alert.getUserId())
                        .map(u -> u.getEmail())
                        .orElse(null);
                    if (userEmail != null) {
                        sendEmail(userEmail, product, currentPrice, alert.getTargetPrice());
                    }
                }

                alert.setNotifiedAt(LocalDateTime.now());
                alertRepository.save(alert);

                log.info("Alert triggered: alertId={}, productId={}, price={}",
                    alert.getId(), productId, currentPrice);

            } catch (Exception e) {
                log.error("Failed to trigger alert {}: {}", alert.getId(), e.getMessage());
            }
        }
    }

    // ── EMAIL via Resend ──────────────────────────────────────────────────────

    private void sendEmail(String toEmail, Product product, int currentPrice, int targetPrice) {
        try {
            NumberFormat fmt = NumberFormat.getNumberInstance(new Locale("vi", "VN"));
            String currentPriceFmt = fmt.format(currentPrice) + "₫";
            String targetPriceFmt = fmt.format(targetPrice) + "₫";

            String imageTag = (product.getImageUrl() != null && !product.getImageUrl().isBlank())
                ? String.format("<img src=\"%s\" alt=\"%s\" style=\"width:100%%;max-width:280px;border-radius:16px;display:block;margin:0 auto 24px;\">",
                    product.getImageUrl(), product.getName())
                : "";

            String html = String.format("""
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width,initial-scale=1">
                </head>
                <body style="margin:0;padding:0;background:#F5F0EB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:40px 16px;">
                    <tr><td align="center">
                      <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
                        <tr>
                          <td style="background:#1F1A17;padding:28px 36px;text-align:center;">
                            <p style="margin:0;font-size:22px;color:#FFFFFF;letter-spacing:-0.5px;">
                              Price<span style="color:#C9949C;">Hawk</span>
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:36px 36px 28px;">
                            <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#8E6A72;">Cảnh báo giá</p>
                            <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1F1A17;letter-spacing:-0.5px;line-height:1.2;">
                              Giá đã chạm ngưỡng!
                            </h1>
                            <p style="margin:0 0 28px;font-size:15px;color:#6B6560;line-height:1.6;">
                              Sản phẩm bạn đang theo dõi vừa xuống mức giá mong muốn.
                            </p>
                            %s
                            <p style="margin:0 0 24px;font-size:17px;font-weight:600;color:#1F1A17;line-height:1.4;">%s</p>
                            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#FBF8F5;border-radius:16px;overflow:hidden;margin-bottom:28px;">
                              <tr>
                                <td style="padding:20px 24px;border-bottom:1px solid #EDE8E3;">
                                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#9A8A7A;">Giá hiện tại</p>
                                  <p style="margin:0;font-size:32px;font-weight:700;color:#8E6A72;letter-spacing:-1px;">%s</p>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:16px 24px;">
                                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#9A8A7A;">Giá mục tiêu của bạn</p>
                                  <p style="margin:0;font-size:18px;color:#1F1A17;font-weight:500;">%s</p>
                                </td>
                              </tr>
                            </table>
                            <table width="100%%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <a href="http://localhost:5173/product/%s"
                                    style="display:inline-block;background:#1F1A17;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
                                    Xem sản phẩm ngay →
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="background:#F5F0EB;padding:20px 36px;text-align:center;">
                            <p style="margin:0;font-size:12px;color:#9A8A7A;line-height:1.6;">
                              Bạn nhận được email này vì đã đặt price alert trên PriceHawk.<br>
                              © 2026 PriceHawk. Smart shopping, quietly curated.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """,
                imageTag, product.getName(), currentPriceFmt, targetPriceFmt, product.getId()
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + resendApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            String safeSubject = product.getName().replace("\"", "'");
            String safeHtml = html.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");

            String body = String.format("""
                {
                    "from": "PriceHawk <onboarding@resend.dev>",
                    "to": ["%s"],
                    "subject": "PriceHawk: %s đã chạm giá mục tiêu!",
                    "html": "%s"
                }
                """, toEmail, safeSubject, safeHtml);

            HttpEntity<String> request = new HttpEntity<>(body, headers);
            restTemplate.postForObject("https://api.resend.com/emails", request, String.class);
            log.info("Email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ── HELPER ────────────────────────────────────────────────────────────────

    private PriceAlert findAndVerify(UUID alertId, String userId) {
        PriceAlert alert = alertRepository.findById(alertId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy alert"));
        if (!alert.getUserId().equals(UUID.fromString(userId))) {
            throw new IllegalStateException("Không có quyền thao tác alert này");
        }
        return alert;
    }

    private PriceAlertResponse toResponse(PriceAlert alert, Product product) {
        String platformName = null;
        if (alert.getPlatformId() != null) {
            platformName = platformRepository.findById(alert.getPlatformId())
                .map(p -> p.getName())
                .orElse(null);
        }

        return PriceAlertResponse.builder()
            .id(alert.getId())
            .productId(alert.getProductId())
            .productName(product != null ? product.getName() : null)
            .productImageUrl(product != null ? product.getImageUrl() : null)
            .targetPrice(alert.getTargetPrice())
            .platformId(alert.getPlatformId())
            .platformName(platformName)
            .channel(alert.getChannel())
            .isActive(alert.isActive())
            .notifiedAt(alert.getNotifiedAt())
            .createdAt(alert.getCreatedAt())
            .updatedAt(alert.getUpdatedAt())
            .build();
    }
}