package com.pricehawl.controller;

import com.pricehawl.dto.AiChatRequest;
import com.pricehawl.dto.AiRecommendationDTO;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.dto.TrendingDealModels.TrendingDealResponse;
import com.pricehawl.dto.TrendingDealModels.TrendingDealsSnapshot;
import com.pricehawl.repository.AiChatRepository;
import com.pricehawl.service.AiChatService;
import com.pricehawl.service.ProductSearchService;
import com.pricehawl.service.TrendingDealService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/ai-chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AiChatController {

    private final AiChatService aiChatService;
    private final ProductSearchService productSearchService;
    private final TrendingDealService trendingDealService;
    private final AiChatRepository aiChatRepository;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(@RequestBody AiChatRequest request) {
        SseEmitter emitter = new SseEmitter(60_000L);

        executor.execute(() -> {
            try {
                List<ProductSearchDTO> products = getProductsForAi(request);

                String answer;

                if (!products.isEmpty()) {
                    answer = buildBackendAnswer(request.message(), products);
                } else {
                    answer = aiChatService.answer(request);
                }

                String[] chunks = answer.split("(?<=\\s)");

                for (String chunk : chunks) {
                    emitter.send(SseEmitter.event()
                            .name("chunk")
                            .data(chunk));

                    Thread.sleep(25);
                }

                emitter.send(SseEmitter.event()
                        .name("products")
                        .data(products));

                emitter.send(SseEmitter.event()
                        .name("done")
                        .data("[DONE]"));

                emitter.complete();

            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("Xin lỗi, AI đang gặp lỗi. Bạn thử lại sau nhé."));
                } catch (Exception ignored) {
                }

                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    private List<ProductSearchDTO> getProductsForAi(AiChatRequest request) {
        String message = request.message();

        if (request.productId() != null || message == null || message.isBlank()) {
            return List.of();
        }

        List<ProductSearchDTO> products;

        if (isWishlistQuestion(message) && request.userId() != null) {
            products = getWishlistProducts(request.userId());
        } else if (isTrendingDealQuestion(message) || isCheapQuestion(message)) {
            products = getTrendingDealProducts();
        } else {
            products = getDatabaseProducts(message);
        }

        if (products.size() > 5) {
            products = products.subList(0, 5);
        }

        return products;
    }

    private List<ProductSearchDTO> getDatabaseProducts(String message) {
        String keyword = normalizeSearchKeyword(message);

        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }

        List<AiRecommendationDTO> recommendations =
                aiChatRepository.searchProductsForAi(keyword, 8);

        if (recommendations == null || recommendations.isEmpty()) {
            return List.of();
        }

        return recommendations.stream()
                .filter(item -> item != null && item.getProductId() != null)
                .map(this::mapRecommendationToProductSearchDTO)
                .toList();
    }

    private String normalizeSearchKeyword(String message) {
        if (message == null || message.isBlank()) {
            return "";
        }

        String q = message.toLowerCase(Locale.ROOT).trim();

        q = q.replace("giá thế nào", "")
                .replace("giá bao nhiêu", "")
                .replace("bao nhiêu tiền", "")
                .replace("có tốt không", "")
                .replace("dùng tốt không", "")
                .replace("dùng ổn không", "")
                .replace("nên mua không", "")
                .replace("của nước nào", "")
                .replace("xuất xứ", "")
                .replace("hãng nào", "")
                .replace("hãng gì", "")
                .replace("thương hiệu nào", "")
                .replace("brand nào", "")
                .replace("sản phẩm", "")
                .replace("mua", "")
                .replace("nên", "")
                .replace("loại nào", "")
                .replace("loại gì", "")
                .replace("?", "")
                .trim();

        return q;
    }

    private boolean isWishlistQuestion(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String q = message.toLowerCase(Locale.ROOT);

        return q.contains("wishlist")
                || q.contains("yêu thích")
                || q.contains("đã lưu")
                || q.contains("dựa trên wishlist")
                || q.contains("sản phẩm đã thích")
                || q.contains("gợi ý sản phẩm cho mình");
    }

    private boolean isTrendingDealQuestion(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String q = message.toLowerCase(Locale.ROOT);

        return q.contains("trending")
                || q.contains("deal hôm nay")
                || q.contains("deals hôm nay")
                || q.contains("đáng mua")
                || q.contains("sale hôm nay")
                || q.contains("giảm giá hôm nay")
                || q.contains("hot deal")
                || q.contains("deal hot")
                || q.contains("sản phẩm nào đáng mua")
                || q.contains("hôm nay có sản phẩm nào");
    }

    private boolean isCheapQuestion(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String q = message.toLowerCase(Locale.ROOT);

        return q.contains("giá rẻ")
                || q.contains("rẻ nhất")
                || q.contains("giá thấp")
                || q.contains("sản phẩm rẻ");
    }

    private List<ProductSearchDTO> getWishlistProducts(UUID userId) {
        List<AiRecommendationDTO> recommendations =
                aiChatRepository.findWishlistRecommendations(userId, 5);

        if (recommendations == null || recommendations.isEmpty()) {
            return List.of();
        }

        return recommendations.stream()
                .filter(item -> item != null && item.getProductId() != null)
                .map(this::mapRecommendationToProductSearchDTO)
                .toList();
    }

    private ProductSearchDTO mapRecommendationToProductSearchDTO(AiRecommendationDTO item) {
        return ProductSearchDTO.builder()
                .id(item.getProductId())
                .name(item.getProductName())
                .brandName(item.getBrandName())
                .categoryName(item.getCategoryName())
                .imageUrl(item.getImageUrl())
                .bestPrice(item.getLowestPrice())
                .score(item.getScore() != null ? item.getScore().doubleValue() : null)
                .build();
    }

    private List<ProductSearchDTO> getTrendingDealProducts() {
        TrendingDealsSnapshot snapshot =
                trendingDealService.getTrendingDealsSnapshot(false, false);

        if (snapshot == null || snapshot.deals() == null || snapshot.deals().isEmpty()) {
            return List.of();
        }

        return snapshot.deals()
                .stream()
                .filter(item -> item != null && item.getProductId() != null)
                .map(this::mapTrendingDealToProductSearchDTO)
                .toList();
    }

    private ProductSearchDTO mapTrendingDealToProductSearchDTO(TrendingDealResponse item) {
        return ProductSearchDTO.builder()
                .id(item.getProductId())
                .name(item.getProductName())
                .imageUrl(item.getImageUrl())
                .bestPrice(item.getCurrentPrice())
                .originalPrice(item.getOriginalPrice())
                .discountPct(toDiscountInt(item.getDiscountPercent()))
                .bestPlatform(item.getPlatformName())
                .score(item.getDealScore())
                .build();
    }

    private String buildBackendAnswer(String message, List<ProductSearchDTO> products) {
        String q = message == null ? "" : message.toLowerCase(Locale.ROOT);

        StringBuilder sb = new StringBuilder();

        if (q.contains("wishlist") || q.contains("yêu thích") || q.contains("đã lưu")) {
            sb.append("Gợi ý dựa trên wishlist:\n");
        } else if (q.contains("giá rẻ") || q.contains("rẻ nhất") || q.contains("giá thấp")) {
            sb.append("Giá rẻ nhất:\n");
        } else if (isTrendingDealQuestion(message)) {
            sb.append("Trending deal hôm nay:\n");
        } else {
            sb.append("Sản phẩm tìm thấy trong hệ thống:\n");
        }

        int count = 0;

        for (ProductSearchDTO p : products) {
            if (count >= 3) {
                break;
            }

            sb.append("- ")
                    .append(p.getName() != null ? p.getName() : "Sản phẩm")
                    .append(": ");

            if (p.getBestPrice() != null) {
                sb.append(formatPrice(p.getBestPrice()));
            } else {
                sb.append("chưa có giá");
            }

            if (p.getBestPlatform() != null && !p.getBestPlatform().isBlank()) {
                sb.append(" — ").append(p.getBestPlatform());
            }

            sb.append("\n");

            count++;
        }

        sb.append("\nBạn có thể bấm vào từng sản phẩm bên dưới để xem chi tiết.");

        return sb.toString();
    }

    private String formatPrice(Integer price) {
        if (price == null) {
            return "chưa có giá";
        }

        return String.format("%,dđ", price).replace(",", ".");
    }

    private Integer toDiscountInt(Float discountPercent) {
        if (discountPercent == null) {
            return null;
        }

        return Math.round(discountPercent);
    }
}