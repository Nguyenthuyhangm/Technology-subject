package com.pricehawl.service;

import com.pricehawl.dto.AiChatHistoryMessage;
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

        boolean wishlistQuestion = isWishlistQuestion(message);

        /*
         * Controller đã tìm sản phẩm trong backend trước.
         * Nếu backend có sản phẩm thì Controller tự trả lời + gửi products cho frontend.
         * Nếu không có sản phẩm thì mới gọi vào AiChatService.
         *
         * Vì vậy:
         * - productId != null: phân tích sản phẩm đang xem.
         * - wishlist: thử lấy wishlist recommendation.
         * - còn lại: coi là câu hỏi ngoài và hỏi Gemini.
         */
        boolean generalKnowledgeQuestion = request.productId() == null && !wishlistQuestion;

        if (request.productId() != null) {
            productContext = aiChatRepository.findProductContext(request.productId());
        }

        if (request.productId() == null && wishlistQuestion && request.userId() != null) {
            recommendations = aiChatRepository.findWishlistRecommendations(request.userId(), 5);

            if (recommendations != null && recommendations.size() > 3) {
                recommendations = recommendations.subList(0, 3);
            }

            if (recommendations == null || recommendations.isEmpty()) {
                generalKnowledgeQuestion = true;
            }
        }

        String systemPrompt = buildSystemPrompt();
        String userPrompt = buildUserPrompt(
                message,
                productContext,
                recommendations,
                generalKnowledgeQuestion,
                request.conversationHistory()
        );

        String aiAnswer = aiLlmClient.generateAnswer(systemPrompt, userPrompt);

        if (aiAnswer != null && !aiAnswer.isBlank()) {
            String normalizedAnswer = normalizeAiAnswer(aiAnswer);

            if (!isBadAiAnswer(normalizedAnswer)) {
                return normalizedAnswer;
            }
        }

        return fallbackAnswer(message, productContext, recommendations, generalKnowledgeQuestion);
    }

    private String buildSystemPrompt() {
        return """
            Bạn là PriceHawk AI, trợ lý tư vấn mua hàng cho website so sánh giá mỹ phẩm.

            QUY TẮC BẮT BUỘC:
            - Trả lời thật ngắn, tối đa 5 dòng.
            - Không mở bài dài.
            - Không giải thích lan man.
            - Nếu user hỏi kiến thức chung như xuất xứ thương hiệu, thành phần, cách dùng, công dụng thì trả lời trực tiếp.
            - Không bắt buộc phải có dữ liệu sản phẩm trong hệ thống với câu hỏi kiến thức chung.
            - Chỉ nói "hệ thống chưa có sản phẩm phù hợp" khi user đang hỏi gợi ý/mua sản phẩm cụ thể.
            - Nếu có dữ liệu sản phẩm từ hệ thống, hãy ưu tiên gợi ý sản phẩm đó.
            - Nếu không có dữ liệu sản phẩm phù hợp trong hệ thống, vẫn được tư vấn kiến thức chung.
            - Không bịa giá, không bịa voucher, không bịa rating.
            - Không nói một sản phẩm có trong PriceHawk nếu dữ liệu không cung cấp.
            - Với giá/deal hiện tại, ưu tiên dữ liệu PriceHawk; nếu không có thì nói cần kiểm tra thêm.
            - Chỉ gợi ý tối đa 3 ý hoặc 3 sản phẩm.
            - Với sản phẩm có dữ liệu: ghi tên ngắn + giá + lý do ngắn.
            - Với câu hỏi chung: trả lời đúng trọng tâm, dễ hiểu.
            - Nếu có lịch sử hội thoại, hãy dùng nó để hiểu các từ như "nó", "sản phẩm đó", "vậy", "cái này".
            - BẮT BUỘC xuống dòng rõ ràng.
            - Trả lời bằng tiếng Việt tự nhiên.
            """;
    }

    private String buildUserPrompt(
            String message,
            AiProductContextDTO product,
            List<AiRecommendationDTO> recommendations,
            boolean generalKnowledgeQuestion,
            List<AiChatHistoryMessage> conversationHistory
    ) {
        StringBuilder sb = new StringBuilder();

        if (conversationHistory != null && !conversationHistory.isEmpty()) {
            sb.append("Lịch sử hội thoại gần đây:\n");

            for (AiChatHistoryMessage h : conversationHistory) {
                if (h == null || h.content() == null || h.content().isBlank()) {
                    continue;
                }

                String roleName = "user".equalsIgnoreCase(h.role())
                        ? "Người dùng"
                        : "AI";

                sb.append("- ")
                        .append(roleName)
                        .append(": ")
                        .append(h.content())
                        .append("\n");
            }

            sb.append("\n");
        }

        sb.append("Câu hỏi hiện tại: ").append(message).append("\n\n");

        if (generalKnowledgeQuestion && product == null) {
            sb.append("""
                Đây là câu hỏi ngoài dữ liệu sản phẩm PriceHawk hiện tại.
                Hãy trả lời bằng kiến thức chung của bạn và trả lời trực tiếp.
                Nếu user hỏi giá/deal hiện tại mà PriceHawk không có dữ liệu, hãy nói không có giá chính xác trong hệ thống.
                Không cần tìm sản phẩm trong hệ thống.
                Không cần nói "hệ thống chưa có sản phẩm phù hợp".
                Không bịa giá, voucher hoặc dữ liệu bán hàng.
                
                Format:
                Trả lời ngắn:
                - [Thông tin chính]
                - [Giải thích thêm nếu cần]

                Kết luận: [1 câu ngắn]
                """);

            return sb.toString();
        }

        if (product != null) {
            sb.append("Sản phẩm đang xem trong hệ thống:\n");
            sb.append("- Tên: ").append(product.getProductName()).append("\n");
            sb.append("- Brand: ").append(product.getBrandName()).append("\n");
            sb.append("- Category: ").append(product.getCategoryName()).append("\n");
            sb.append("- Loại da: ").append(nullToUnknown(product.getSkinType())).append("\n");
            sb.append("- Giá hiện tại: ").append(formatPrice(product.getCurrentPrice())).append("\n");
            sb.append("- Giá thấp nhất: ").append(formatPrice(product.getLowestPrice())).append("\n");
            sb.append("- Giá TB 30 ngày: ").append(formatDecimalPrice(product.getAvg30dPrice())).append("\n\n");
        }

        if (recommendations != null && !recommendations.isEmpty()) {
            sb.append("Top sản phẩm phù hợp trong hệ thống:\n");

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

            sb.append("""
                
                Hãy trả lời theo format:
                Gợi ý nhanh:
                - Tên sản phẩm: giá — lý do ngắn
                - Tên sản phẩm: giá — lý do ngắn

                Kết luận: 1 câu ngắn nên xem / đặt alert.
                """);
        } else {
            sb.append("""
                Không có sản phẩm phù hợp với câu hỏi trong dữ liệu PriceHawk hiện tại.

                Hãy vẫn trả lời bằng kiến thức chung.
                Không được bịa tên sản phẩm, giá, voucher hoặc nói là PriceHawk có sản phẩm đó.
                
                Hãy trả lời theo format:
                Hiện hệ thống chưa có sản phẩm phù hợp, nhưng bạn có thể tham khảo:
                - Tiêu chí 1
                - Tiêu chí 2
                - Tiêu chí 3

                Kết luận: 1 câu ngắn.
                """);
        }

        return sb.toString();
    }

    private String fallbackAnswer(
            String message,
            AiProductContextDTO product,
            List<AiRecommendationDTO> recommendations,
            boolean generalKnowledgeQuestion
    ) {
        if (generalKnowledgeQuestion && product == null) {
            return generalKnowledgeFallbackAnswer(message);
        }

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

            return generalFallbackAnswer(message);
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

    private String generalKnowledgeFallbackAnswer(String message) {
        return """
            Trả lời ngắn:
            - Mình chưa có dữ liệu chính xác từ PriceHawk cho câu hỏi này.
            - Bạn có thể hỏi thông tin chung như xuất xứ, công dụng, thành phần hoặc cách dùng.
            - Nếu hỏi giá/deal hiện tại thì cần có dữ liệu sản phẩm trong hệ thống.

            Kết luận: Nếu sản phẩm chưa có trong PriceHawk, mình sẽ chỉ tư vấn được theo kiến thức chung.
            """;
    }

    private String generalFallbackAnswer(String message) {
        String q = message == null ? "" : message.toLowerCase(Locale.ROOT);

        if (q.contains("da khô") || q.contains("dưỡng ẩm") || q.contains("kem dưỡng")) {
            return """
                Hiện hệ thống chưa có sản phẩm phù hợp, nhưng bạn có thể tham khảo:
                - Chọn kem dưỡng có hyaluronic acid, glycerin, ceramide hoặc B5.
                - Tránh sản phẩm có cồn khô mạnh nếu da dễ bong tróc.
                - Nên ưu tiên texture cream hoặc lotion đặc hơn gel.

                Kết luận: Hãy tìm kem dưỡng phục hồi ẩm và đặt alert khi thấy sản phẩm phù hợp.
                """;
        }

        if (q.contains("mụn") || q.contains("da dầu")) {
            return """
                Hiện hệ thống chưa có sản phẩm phù hợp, nhưng bạn có thể tham khảo:
                - Da dầu/mụn nên chọn sản phẩm non-comedogenic, dạng gel hoặc lotion nhẹ.
                - Có thể tìm niacinamide, BHA hoặc tea tree ở nồng độ phù hợp.
                - Tránh kem quá bí nếu da dễ lên mụn.

                Kết luận: Nên chọn sản phẩm nhẹ, ít gây bít tắc và theo dõi phản ứng da.
                """;
        }

        if (q.contains("chống nắng") || q.contains("sunscreen")) {
            return """
                Hiện hệ thống chưa có sản phẩm phù hợp, nhưng bạn có thể tham khảo:
                - Nên chọn SPF từ 30 trở lên và có PA+++ hoặc PA++++.
                - Da dầu nên chọn dạng gel/sữa, da khô nên chọn loại có dưỡng ẩm.
                - Dùng đủ lượng và thoa lại nếu ở ngoài trời lâu.

                Kết luận: Hãy ưu tiên kem chống nắng hợp loại da trước khi so giá.
                """;
        }

        if (q.contains("tóc") || q.contains("dầu gội") || q.contains("kem xả")) {
            return """
                Hiện hệ thống chưa có sản phẩm phù hợp, nhưng bạn có thể tham khảo:
                - Tóc khô nên chọn sản phẩm có dầu dưỡng, keratin hoặc amino acid.
                - Da đầu dầu nên chọn dầu gội làm sạch nhẹ, tránh quá nhiều silicone.
                - Tóc hư tổn nên ưu tiên dòng phục hồi.

                Kết luận: Hãy xác định tình trạng tóc rồi tìm sản phẩm phù hợp để theo dõi giá.
                """;
        }

        return """
            Hiện hệ thống chưa có sản phẩm phù hợp, nhưng bạn có thể tham khảo:
            - Xác định nhu cầu chính trước: dưỡng ẩm, làm sạch, chống nắng hay phục hồi.
            - Chọn sản phẩm theo loại da/tóc và thành phần phù hợp.
            - Khi tìm thấy sản phẩm ưng ý, hãy thêm vào wishlist để theo dõi giá.

            Kết luận: Mình có thể tư vấn chung, còn giá cụ thể cần dữ liệu trong hệ thống.
            """;
    }

    private boolean isProductShoppingQuestion(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String q = message.toLowerCase(Locale.ROOT);

        return q.contains("gợi ý")
                || q.contains("recommend")
                || q.contains("sản phẩm")
                || q.contains("mua")
                || q.contains("nên mua")
                || q.contains("giá")
                || q.contains("deal")
                || q.contains("sale")
                || q.contains("rẻ")
                || q.contains("đắt")
                || q.contains("so sánh")
                || q.contains("wishlist")
                || q.contains("đặt alert")
                || q.contains("kem dưỡng nào")
                || q.contains("sữa rửa mặt nào")
                || q.contains("kem chống nắng nào")
                || q.contains("son nào")
                || q.contains("serum nào")
                || q.contains("dầu gội nào")
                || q.contains("tẩy trang nào");
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
                .replace("Trả lời ngắn:", "Trả lời ngắn:\n")
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
                .replace("Trả lời ngắn", "")
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