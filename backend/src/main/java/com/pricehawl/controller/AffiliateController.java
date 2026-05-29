package com.pricehawl.controller;

import com.pricehawl.service.AffiliateService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.pricehawl.security.UserPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/go")
@RequiredArgsConstructor
public class AffiliateController {

    private final AffiliateService affiliateService;

    /**
     * GET /api/go/{productId}?platform=tiki
     * → Log click → Redirect 302 đến affiliate link
     */
    @GetMapping("/{productId}")
    public void redirect(
        @PathVariable UUID productId,
        @RequestParam String platform,
        @AuthenticationPrincipal UserPrincipal principal,
        HttpServletRequest request,
        HttpServletResponse response
    ) throws IOException {
        String userId = principal != null ? principal.getUserId() : null;
        String ip = getClientIp(request);
        String userAgent = request.getHeader("User-Agent");

        String affiliateUrl = affiliateService.processClick(
            productId, platform, userId, ip, userAgent
        );

        response.sendRedirect(affiliateUrl);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) {
            ip = request.getRemoteAddr();
        }
        // X-Forwarded-For có thể chứa nhiều IP, lấy cái đầu tiên
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}