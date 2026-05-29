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

        boolean wishlistQuestion = isWishlistQuestion(message);
        boolean productShoppingQuestion = isProductShoppingQuestion(message);
        boolean generalKnowledgeQuestion =
                request.productId() == null && !wishlistQuestion && !productShoppingQuestion;

        if (request.productId() != null) {
            productContext = aiChatRepository.findProductContext(request.productId());
        }

        /*
         * Chỉ query database PriceHawk khi:
         * - User đang hỏi wishlist
         * - User hỏi mua hàng / giá / deal / gợi ý sản phẩm
         *
         * Nếu là câu hỏi kiến thức chung như:
         * - La Roche-Posay là hãng của nước nào?
         * - Retinol dùng thế nào?
         * - Niacinamide có tác dụng gì?
         * thì KHÔNG query DB, mà hỏi thẳng Gemini.
         */
        if (request.productId() == null && !generalKnowledgeQuestion) {
            if (request.userId() != null && wishlistQuestion) {
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
        String userPrompt = buildUserPrompt(
                message,
                productContext,
                recommendations,
                generalKnowledgeQuestion
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
            - BẮT BUỘC xuống dòng rõ ràng.
            - Trả lời bằng tiếng Việt tự nhiên.
            """;
    }

    private String buildUserPrompt(
            String message,
            AiProductContextDTO product,
            List<AiRecommendationDTO> recommendations,
            boolean generalKnowledgeQuestion
    ) {
        StringBuilder sb = new StringBuilder();

        sb.append("Câu hỏi: ").append(message).append("\n\n");

        if (generalKnowledgeQuestion && product == null) {
            sb.append("""
                Đây là câu hỏi kiến thức chung / ngoài dữ liệu sản phẩm PriceHawk.
                Hãy hỏi bằng kiến thức của Gemini và trả lời trực tiếp.
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
        String q = message == null ? "" : message.toLowerCase(Locale.ROOT);

        if (q.contains("laroche") || q.contains("la roche") || q.contains("la roche-posay")) {
            return """
                Trả lời ngắn:
                - La Roche-Posay là thương hiệu dược mỹ phẩm của Pháp.
                - Hãng nổi tiếng với các sản phẩm cho da nhạy cảm, da mụn và phục hồi da.

                Kết luận: Đây là thương hiệu Pháp, thường thuộc nhóm dược mỹ phẩm.
                """;
        }

        if (q.contains("cerave")) {
            return """
                Trả lời ngắn:
                - CeraVe là thương hiệu chăm sóc da của Mỹ.
                - Hãng nổi bật với các sản phẩm chứa ceramide, phù hợp phục hồi hàng rào bảo vệ da.

                Kết luận: CeraVe thường được chọn cho da khô, nhạy cảm hoặc cần phục hồi.
                """;
        }

        if (q.contains("anessa")) {
            return """
                Trả lời ngắn:
                - Anessa là thương hiệu chống nắng của Nhật Bản.
                - Hãng thuộc Shiseido và nổi tiếng với các sản phẩm kem chống nắng.

                Kết luận: Đây là thương hiệu Nhật, mạnh về chống nắng.
                """;
        }

        if (q.contains("retinol")) {
            return """
                Trả lời ngắn:
                - Retinol hỗ trợ cải thiện mụn, lão hóa và kết cấu da.
                - Nên dùng buổi tối, bắt đầu tần suất thấp và chống nắng kỹ ban ngày.

                Kết luận: Retinol hiệu quả nhưng cần dùng từ từ để tránh kích ứng.
                """;
        }

        if (q.contains("niacinamide")) {
            return """
                Trả lời ngắn:
                - Niacinamide hỗ trợ giảm dầu, làm dịu da và cải thiện hàng rào bảo vệ da.
                - Thường phù hợp với nhiều loại da, kể cả da dầu và da mụn.

                Kết luận: Đây là thành phần dễ dùng nếu chọn nồng độ phù hợp.
                """;
        }

        return """
            Trả lời ngắn:
            - Với giá, deal hoặc sản phẩm cụ thể, mình sẽ cần dữ liệu từ PriceHawk.

            Hãy hỏi kèm tên thương hiệu, thành phần hoặc nhu cầu cụ thể.
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