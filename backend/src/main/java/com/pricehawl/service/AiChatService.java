package com.pricehawl.service;

import com.pricehawl.dto.AiChatRequest;
import com.pricehawl.dto.AiProductContextDTO;
import com.pricehawl.dto.AiRecommendationDTO;
import com.pricehawl.repository.AiChatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AiChatService {

    private final AiChatRepository aiChatRepository;
    private final AiLlmClient aiLlmClient;

    public String answer(AiChatRequest request) {
        String message = request.message();

        AiProductContextDTO productContext = null;
        List<AiRecommendationDTO> recommendations = List.of();

        if (request.productId() != null) {
            productContext = aiChatRepository.findProductContext(request.productId());
        }

        if (request.productId() == null) {
            if (request.userId() != null && isWishlistQuestion(message)) {
                recommendations = aiChatRepository.findWishlistRecommendations(request.userId(), 5);
            } else {
                String keyword = extractSearchKeyword(message);
                recommendations = aiChatRepository.searchProductsForAi(keyword, 8);
            }

            recommendations = filterRecommendationsByQuestion(message, recommendations);

            if (recommendations.size() > 3) {
                recommendations = recommendations.subList(0, 3);
            }
        }

        String systemPrompt = buildSystemPrompt();
        String userPrompt = buildUserPrompt(message, productContext, recommendations);

        String aiAnswer = aiLlmClient.generateAnswer(systemPrompt, userPrompt);

        if (aiAnswer != null && !aiAnswer.isBlank()) {
            String normalizedAnswer = normalizeAiAnswer(aiAnswer);

            if (!isBadAiAnswer(normalizedAnswer)) {
                return normalizedAnswer;
            }
        }

        return fallbackAnswer(message, productContext, recommendations);
    }

    private String buildSystemPrompt() {
        return """
            Bạn là PriceHawk AI, trợ lý tư vấn mua hàng cho website so sánh giá mỹ phẩm.

            QUY TẮC BẮT BUỘC:
            - Trả lời thật ngắn, tối đa 4 dòng.
            - Không mở bài dài.
            - Không giải thích lan man.
            - Chỉ gợi ý tối đa 3 sản phẩm.
            - Chỉ gợi ý sản phẩm liên quan trực tiếp đến câu hỏi của user.
            - Nếu dữ liệu gợi ý không liên quan đến câu hỏi, hãy nói chưa có dữ liệu phù hợp.
            - Mỗi sản phẩm chỉ ghi: tên ngắn + giá + lý do ngắn.
            - Không bịa giá, không bịa voucher, không bịa rating.
            - Nếu thiếu dữ liệu thì nói ngắn gọn là chưa đủ dữ liệu.
            - Kết luận bằng 1 câu: nên xem / nên thêm wishlist / nên đặt alert.
            - BẮT BUỘC xuống dòng sau tiêu đề "Gợi ý nhanh:".
            - BẮT BUỘC mỗi sản phẩm nằm trên một dòng riêng.
            - Trả lời bằng tiếng Việt tự nhiên.
            """;
    }

    private String buildUserPrompt(
            String message,
            AiProductContextDTO product,
            List<AiRecommendationDTO> recommendations
    ) {
        StringBuilder sb = new StringBuilder();

        sb.append("Câu hỏi: ").append(message).append("\n\n");

        if (product != null) {
            sb.append("Sản phẩm đang xem:\n");
            sb.append("- Tên: ").append(product.getProductName()).append("\n");
            sb.append("- Brand: ").append(product.getBrandName()).append("\n");
            sb.append("- Category: ").append(product.getCategoryName()).append("\n");
            sb.append("- Loại da: ").append(nullToUnknown(product.getSkinType())).append("\n");
            sb.append("- Giá hiện tại: ").append(formatPrice(product.getCurrentPrice())).append("\n");
            sb.append("- Giá thấp nhất: ").append(formatPrice(product.getLowestPrice())).append("\n");
            sb.append("- Giá TB 30 ngày: ").append(formatDecimalPrice(product.getAvg30dPrice())).append("\n\n");
        }

        if (recommendations != null && !recommendations.isEmpty()) {
            sb.append("Top sản phẩm gợi ý phù hợp câu hỏi:\n");

            int count = 0;
            for (AiRecommendationDTO item : recommendations) {
                if (count >= 3) break;

                sb.append("- ")
                        .append(shortName(item.getProductName()))
                        .append(" | Category: ").append(nullToUnknown(item.getCategoryName()))
                        .append(" | Giá: ").append(formatPrice(item.getLowestPrice()))
                        .append(" | Lý do: ").append(cleanReason(item.getReason()))
                        .append("\n");

                count++;
            }
        } else {
            sb.append("Không có sản phẩm phù hợp với câu hỏi trong dữ liệu hiện có.\n");
        }

        sb.append("""
            
            Trả lời ngắn gọn, đúng trọng tâm câu hỏi.
            Nếu không có sản phẩm phù hợp, nói rõ là chưa có dữ liệu phù hợp.
            Giữ đúng format xuống dòng:

            Gợi ý nhanh:
            - Tên sản phẩm: giá — lý do ngắn
            - Tên sản phẩm: giá — lý do ngắn

            Kết luận: 1 câu ngắn nên xem / đặt alert.
            """);

        return sb.toString();
    }

    private String fallbackAnswer(
            String message,
            AiProductContextDTO product,
            List<AiRecommendationDTO> recommendations
    ) {
        if (product == null) {
            if (recommendations != null && !recommendations.isEmpty()) {
                StringBuilder sb = new StringBuilder();

                sb.append("Gợi ý nhanh:\n");

                int count = 0;
                for (AiRecommendationDTO item : recommendations) {
                    if (count >= 3) break;

                    sb.append("- ")
                            .append(shortName(item.getProductName()))
                            .append(": ")
                            .append(formatPrice(item.getLowestPrice()))
                            .append(" — ")
                            .append(cleanReason(item.getReason()))
                            .append("\n");

                    count++;
                }

                sb.append("Kết luận: Bạn nên xem 1–2 sản phẩm đầu, nếu chưa cần mua thì đặt alert.");
                return sb.toString();
            }

            return "Mình chưa tìm thấy sản phẩm phù hợp với câu hỏi này trong dữ liệu hiện có.";
        }

        Integer currentPrice = product.getCurrentPrice();
        Integer lowestPrice = product.getLowestPrice();
        BigDecimal avg30d = product.getAvg30dPrice();

        StringBuilder sb = new StringBuilder();

        sb.append("Phân tích nhanh:\n");
        sb.append("- ").append(shortName(product.getProductName())).append("\n");
        sb.append("- Giá hiện tại: ").append(formatPrice(currentPrice)).append("\n");
        sb.append("- Giá thấp nhất: ").append(formatPrice(lowestPrice)).append("\n");

        if (currentPrice == null) {
            sb.append("Kết luận: Chưa đủ dữ liệu giá để khuyên mua.");
            return sb.toString();
        }

        if (lowestPrice != null && currentPrice <= lowestPrice * 1.05) {
            sb.append("Kết luận: Giá đang khá tốt, có thể cân nhắc mua.");
        } else if (avg30d != null && currentPrice > avg30d.intValue()) {
            sb.append("Kết luận: Giá hơi cao, nên chờ hoặc đặt alert.");
        } else {
            sb.append("Kết luận: Có thể xem thêm, nếu chưa cần thì đặt alert.");
        }

        return sb.toString();
    }

    private boolean isWishlistQuestion(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String q = message.toLowerCase(Locale.ROOT);

        return q.contains("wishlist")
                || q.contains("đã lưu")
                || q.contains("đã thêm")
                || q.contains("yêu thích")
                || q.contains("sản phẩm đã thích")
                || q.contains("dựa trên sản phẩm bạn đã thêm");
    }

    private String extractSearchKeyword(String message) {
        if (message == null || message.isBlank()) {
            return "";
        }

        String q = message.toLowerCase(Locale.ROOT);

        if (q.contains("kem dưỡng") || q.contains("dưỡng ẩm") || q.contains("da khô") || q.contains("moisturizer")) {
            return "kem dưỡng";
        }

        if (q.contains("sữa rửa mặt") || q.contains("rửa mặt") || q.contains("cleanser")) {
            return "sữa rửa mặt";
        }

        if (q.contains("kem chống nắng") || q.contains("chống nắng") || q.contains("sunscreen")) {
            return "chống nắng";
        }

        if (q.contains("son dưỡng") || q.contains("dưỡng môi") || q.contains("môi") || q.contains("lip")) {
            return "son dưỡng";
        }

        if (q.contains("dầu gội") || q.contains("kem xả") || q.contains("dầu dưỡng") || q.contains("tóc")) {
            return "tóc";
        }

        if (q.contains("tẩy trang")) {
            return "tẩy trang";
        }

        if (q.contains("serum")) {
            return "serum";
        }

        return message.trim();
    }

    private List<AiRecommendationDTO> filterRecommendationsByQuestion(
            String message,
            List<AiRecommendationDTO> recommendations
    ) {
        if (recommendations == null || recommendations.isEmpty()) {
            return List.of();
        }

        if (message == null || message.isBlank()) {
            return recommendations;
        }

        String q = message.toLowerCase(Locale.ROOT);

        boolean asksMoisturizer =
                q.contains("kem dưỡng") ||
                q.contains("dưỡng ẩm") ||
                q.contains("moisturizer");

        boolean asksDrySkin =
                q.contains("da khô") ||
                q.contains("dry skin") ||
                q.contains("khô da");

        boolean asksCleanser =
                q.contains("sữa rửa mặt") ||
                q.contains("cleanser") ||
                q.contains("rửa mặt");

        boolean asksSunscreen =
                q.contains("kem chống nắng") ||
                q.contains("chống nắng") ||
                q.contains("sunscreen");

        boolean asksHair =
                q.contains("tóc") ||
                q.contains("dầu gội") ||
                q.contains("dầu dưỡng") ||
                q.contains("kem xả");

        boolean asksLip =
                q.contains("son") ||
                q.contains("môi") ||
                q.contains("lip");

        boolean asksMakeup =
                q.contains("makeup") ||
                q.contains("trang điểm") ||
                q.contains("kem nền") ||
                q.contains("phấn");

        boolean asksMakeupRemover =
                q.contains("tẩy trang");

        boolean asksSerum =
                q.contains("serum");

        boolean hasSpecificIntent =
                asksMoisturizer ||
                asksDrySkin ||
                asksCleanser ||
                asksSunscreen ||
                asksHair ||
                asksLip ||
                asksMakeup ||
                asksMakeupRemover ||
                asksSerum;

        if (!hasSpecificIntent) {
            return recommendations;
        }

        List<AiRecommendationDTO> filtered = recommendations.stream()
                .filter(item -> {
                    String name = safeLower(item.getProductName());
                    String category = safeLower(item.getCategoryName());

                    if (asksMoisturizer || asksDrySkin) {
                        return name.contains("kem dưỡng")
                                || name.contains("dưỡng ẩm")
                                || name.contains("hyalur")
                                || name.contains("b5")
                                || category.contains("kem dưỡng")
                                || category.contains("chăm sóc da")
                                || category.contains("skin care");
                    }

                    if (asksCleanser) {
                        return name.contains("sữa rửa mặt")
                                || name.contains("cleanser")
                                || name.contains("rửa mặt");
                    }

                    if (asksSunscreen) {
                        return name.contains("chống nắng")
                                || name.contains("sunscreen")
                                || name.contains("spf");
                    }

                    if (asksHair) {
                        return name.contains("tóc")
                                || name.contains("dầu gội")
                                || name.contains("kem xả")
                                || name.contains("dầu dưỡng")
                                || category.contains("tóc")
                                || category.contains("hair");
                    }

                    if (asksLip) {
                        return name.contains("son")
                                || name.contains("môi")
                                || name.contains("lip");
                    }

                    if (asksMakeup) {
                        return name.contains("makeup")
                                || name.contains("trang điểm")
                                || name.contains("kem nền")
                                || name.contains("phấn")
                                || category.contains("make")
                                || category.contains("trang điểm");
                    }

                    if (asksMakeupRemover) {
                        return name.contains("tẩy trang")
                                || category.contains("tẩy trang");
                    }

                    if (asksSerum) {
                        return name.contains("serum")
                                || category.contains("serum");
                    }

                    return true;
                })
                .toList();

        return filtered;
    }

    private String normalizeAiAnswer(String answer) {
        if (answer == null || answer.isBlank()) {
            return answer;
        }

        return answer
                .replace("Gợi ý nhanh:-", "Gợi ý nhanh:\n-")
                .replace("Gợi ý nhanh: -", "Gợi ý nhanh:\n-")
                .replace("Gợi ý nhanh:", "Gợi ý nhanh:\n")
                .replace("Kết luận:", "\nKết luận:")
                .replaceAll("\\s+-\\s+", "\n- ")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    private boolean isBadAiAnswer(String answer) {
        if (answer == null || answer.isBlank()) {
            return true;
        }

        String cleaned = answer.trim()
                .replace("-", "")
                .replace(":", "")
                .replace("Gợi ý nhanh", "")
                .replace("Kết luận", "")
                .trim();

        return cleaned.length() < 20;
    }

    private String formatPrice(Integer price) {
        if (price == null) {
            return "chưa có giá";
        }

        NumberFormat formatter = NumberFormat.getInstance(new Locale("vi", "VN"));
        return formatter.format(price) + "đ";
    }

    private String formatDecimalPrice(BigDecimal price) {
        if (price == null) {
            return "chưa có dữ liệu";
        }

        return formatPrice(price.intValue());
    }

    private String nullToUnknown(String value) {
        if (value == null || value.isBlank()) {
            return "Chưa rõ";
        }

        return value;
    }

    private String cleanReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "phù hợp với câu hỏi";
        }

        String cleaned = reason
                .replace("Cùng danh mục.", "cùng danh mục")
                .replace("Cùng thương hiệu.", "cùng thương hiệu")
                .replace("Phù hợp loại da.", "phù hợp loại da")
                .replace("Phù hợp với câu hỏi tìm kiếm.", "phù hợp với câu hỏi")
                .replace("Cùng danh m?c.", "cùng danh mục")
                .replace("Cùng th??ng hi?u.", "cùng thương hiệu")
                .replace("Phù h?p lo?i da.", "phù hợp loại da")
                .trim();

        if (cleaned.isBlank()) {
            return "phù hợp với câu hỏi";
        }

        return cleaned;
    }

    private String shortName(String name) {
        if (name == null || name.isBlank()) {
            return "Sản phẩm";
        }

        String cleaned = name.trim();

        if (cleaned.length() <= 55) {
            return cleaned;
        }

        return cleaned.substring(0, 55).trim() + "...";
    }

    private String safeLower(String value) {
        if (value == null) {
            return "";
        }

        return value.toLowerCase(Locale.ROOT);
    }
}