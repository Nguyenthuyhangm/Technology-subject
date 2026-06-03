package com.pricehawl.service;

import com.pricehawl.dto.AiChatHistoryMessage;
import com.pricehawl.dto.AiChatRequest;
import com.pricehawl.dto.AiProductContextDTO;
import com.pricehawl.dto.AiRecommendationDTO;
import com.pricehawl.repository.AiChatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiChatServiceTest {

    @Mock
    private AiChatRepository aiChatRepository;

    @Mock
    private AiLlmClient aiLlmClient;

    @InjectMocks
    private AiChatService aiChatService;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private AiProductContextDTO buildProduct(Integer currentPrice, Integer lowestPrice, BigDecimal avg30d) {
    // Mock cái interface thay vì khởi tạo class
    AiProductContextDTO p = mock(AiProductContextDTO.class);
    
    // Stub các giá trị cần thiết cho logic của Service
    lenient().when(p.getProductName()).thenReturn("Kem Dưỡng CeraVe Moisturizing Cream 250g");
    lenient().when(p.getBrandName()).thenReturn("CeraVe");
    lenient().when(p.getCategoryName()).thenReturn("Kem dưỡng");
    lenient().when(p.getSkinType()).thenReturn("Da khô");
    lenient().when(p.getCurrentPrice()).thenReturn(currentPrice);
    lenient().when(p.getLowestPrice()).thenReturn(lowestPrice);
    lenient().when(p.getAvg30dPrice()).thenReturn(avg30d);
    
    return p;
}
    private AiRecommendationDTO buildRec(String name, String category, Integer lowestPrice, String reason) {
        AiRecommendationDTO r = new AiRecommendationDTO();
        r.setProductName(name);
        r.setCategoryName(category);
        r.setLowestPrice(lowestPrice);
        r.setReason(reason);
        return r;
    }

    private AiChatRequest req(String message, Long productId, Long userId, List<AiChatHistoryMessage> history) {
        return new AiChatRequest(message, productId, userId, history);
    }

    // ── answer() - các nhánh chính ────────────────────────────────────────────

    @Test
    @DisplayName("1. AI trả lời tốt -> trả về normalizedAnswer (có productId)")
    void answer_withProductId_aiAnswerGood() {
        AiProductContextDTO product = buildProduct(80_000, 75_000, new BigDecimal("90000"));
        when(aiChatRepository.findProductContext(1L)).thenReturn(product);
        when(aiLlmClient.generateAnswer(anyString(), anyString()))
                .thenReturn("Gợi ý nhanh:\n- CeraVe: 80.000đ — dưỡng ẩm tốt\nKết luận: Nên mua ngay.");

        String result = aiChatService.answer(req("sản phẩm này có tốt không?", 1L, null, null));

        assertNotNull(result);
        assertTrue(result.contains("CeraVe"));
    }

    @Test
    @DisplayName("2. AI trả về null -> fallback (có productId, giá tốt)")
    void answer_withProductId_aiNull_fallback_goodPrice() {
        AiProductContextDTO product = buildProduct(75_000, 75_000, new BigDecimal("80000"));
        when(aiChatRepository.findProductContext(1L)).thenReturn(product);
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);

        String result = aiChatService.answer(req("sản phẩm này thế nào?", 1L, null, null));

        assertTrue(result.contains("Giá đang khá tốt"));
    }

    @Test
    @DisplayName("3. AI trả về blank -> fallback (có productId, giá cao hơn avg30d)")
    void answer_withProductId_aiBlank_fallback_priceHigherThanAvg() {
        AiProductContextDTO product = buildProduct(100_000, 70_000, new BigDecimal("85000"));
        when(aiChatRepository.findProductContext(1L)).thenReturn(product);
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn("   ");

        String result = aiChatService.answer(req("có nên mua không?", 1L, null, null));

        assertTrue(result.contains("hơi cao") || result.contains("đặt alert"));
    }

    @Test
    @DisplayName("4. Fallback - productId có nhưng currentPrice null")
    void answer_withProductId_currentPriceNull_fallback() {
        AiProductContextDTO product = buildProduct(null, 70_000, null);
        when(aiChatRepository.findProductContext(1L)).thenReturn(product);
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);

        String result = aiChatService.answer(req("giá bao nhiêu?", 1L, null, null));

        assertTrue(result.contains("Chưa đủ dữ liệu giá"));
    }

    @Test
    @DisplayName("5. Fallback - productId có, lowestPrice null & avg30d null -> nhánh else cuối")
    void answer_withProductId_allPriceNull_fallback_elseClause() {
        AiProductContextDTO product = buildProduct(100_000, null, null);
        when(aiChatRepository.findProductContext(1L)).thenReturn(product);
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);

        String result = aiChatService.answer(req("có nên mua không?", 1L, null, null));

        assertTrue(result.contains("đặt alert") || result.contains("xem thêm"));
    }

    @Test
    @DisplayName("6. Wishlist question + userId có + recommendations > 3 -> cắt còn 3")
    void answer_wishlistQuestion_recommendationsMoreThan3() {
        List<AiRecommendationDTO> recs = List.of(
                buildRec("Kem A", "Kem dưỡng", 100_000, "Cùng danh mục."),
                buildRec("Kem B", "Kem dưỡng", 90_000, "Cùng thương hiệu."),
                buildRec("Kem C", "Kem dưỡng", 80_000, "Phù hợp loại da."),
                buildRec("Kem D", "Kem dưỡng", 70_000, "Phù hợp với câu hỏi tìm kiếm.")
        );
        when(aiChatRepository.findWishlistRecommendations(10L, 5)).thenReturn(recs);
        when(aiLlmClient.generateAnswer(anyString(), anyString()))
                .thenReturn("Gợi ý nhanh:\n- Kem A: 100.000đ — cùng danh mục\nKết luận: Nên xem.");

        String result = aiChatService.answer(req("wishlist của tôi có gì?", null, 10L, null));

        assertNotNull(result);
    }

    @Test
    @DisplayName("7. Wishlist question + userId có + recommendations null -> generalKnowledge=true")
    void answer_wishlistQuestion_recommendationsNull_fallbackGeneral() {
        when(aiChatRepository.findWishlistRecommendations(10L, 5)).thenReturn(null);
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);

        String result = aiChatService.answer(req("dựa trên sản phẩm bạn đã thêm gợi ý tôi", null, 10L, null));

        assertTrue(result.contains("PriceHawk") || result.contains("kiến thức chung"));
    }

    @Test
    @DisplayName("8. Wishlist question + userId có + recommendations empty -> generalKnowledge=true")
    void answer_wishlistQuestion_recommendationsEmpty_fallbackGeneral() {
        when(aiChatRepository.findWishlistRecommendations(10L, 5)).thenReturn(List.of());
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);

        String result = aiChatService.answer(req("sản phẩm đã thích của tôi", null, 10L, null));

        assertNotNull(result);
    }

    @Test
    @DisplayName("9. Wishlist question + userId null -> không gọi repo, generalKnowledge=false")
    void answer_wishlistQuestion_userIdNull() {
        when(aiLlmClient.generateAnswer(anyString(), anyString()))
                .thenReturn("Trả lời ngắn:\n- Không có dữ liệu\nKết luận: Cần đăng nhập.");

        String result = aiChatService.answer(req("wishlist của tôi thế nào?", null, null, null));

        verify(aiChatRepository, never()).findWishlistRecommendations(any(), anyInt());
        assertNotNull(result);
    }

    @Test
    @DisplayName("10. General knowledge question - AI trả về tốt")
    void answer_generalKnowledge_aiGoodAnswer() {
        when(aiLlmClient.generateAnswer(anyString(), anyString()))
                .thenReturn("Trả lời ngắn:\n- CeraVe xuất xứ Mỹ\n- Thành phần tốt\nKết luận: Phù hợp da khô.");

        String result = aiChatService.answer(req("CeraVe xuất xứ từ đâu?", null, null, null));

        assertNotNull(result);
        assertTrue(result.contains("CeraVe"));
    }

    @Test
    @DisplayName("11. General knowledge - AI trả về bad (quá ngắn) -> generalKnowledgeFallback")
    void answer_generalKnowledge_aiBadAnswer_fallback() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn("Ok");

        String result = aiChatService.answer(req("thương hiệu này từ đâu?", null, null, null));

        assertTrue(result.contains("PriceHawk") || result.contains("kiến thức chung"));
    }

    @Test
    @DisplayName("12. Fallback - product null + recommendations có -> build gợi ý nhanh")
    void answer_fallback_noProduct_hasRecommendations() {
        List<AiRecommendationDTO> recs = List.of(
                buildRec("Serum Vitamin C XYZ", "Serum", 250_000, "Phù hợp với câu hỏi tìm kiếm."),
                buildRec("Serum B5 ABC", "Serum", 180_000, null)
        );
        when(aiChatRepository.findWishlistRecommendations(5L, 5)).thenReturn(recs);
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);

        String result = aiChatService.answer(req("yêu thích", null, 5L, null));

        assertTrue(result.contains("Gợi ý nhanh") || result.contains("Kết luận"));
    }

    @Test
    @DisplayName("13. Fallback - recommendations có > 3 items -> chỉ lấy 3")
    void answer_fallback_recommendations_moreThan3_capAt3() {
        List<AiRecommendationDTO> recs = new ArrayList<>();
        for (int i = 1; i <= 4; i++) {
            recs.add(buildRec("Sản phẩm " + i, "Kem dưỡng", i * 10_000, "lý do " + i));
        }
        when(aiChatRepository.findWishlistRecommendations(5L, 5)).thenReturn(recs);
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);

        String result = aiChatService.answer(req("đã lưu của tôi", null, 5L, null));

        // chỉ 3 sản phẩm được render
        long count = result.lines().filter(l -> l.startsWith("- Sản phẩm")).count();
        assertTrue(count <= 3);
    }

    // ── buildUserPrompt - conversation history ────────────────────────────────

    @Test
    @DisplayName("14. buildUserPrompt - conversationHistory không null, có entry hợp lệ + null entry")
    void answer_withConversationHistory_mixedEntries() {
        AiChatHistoryMessage validUser = new AiChatHistoryMessage("user", "sản phẩm này thế nào?");
        AiChatHistoryMessage validAi   = new AiChatHistoryMessage("assistant", "Giá ổn, nên mua.");
        AiChatHistoryMessage nullContent = new AiChatHistoryMessage("user", null);
        AiChatHistoryMessage blankContent = new AiChatHistoryMessage("user", "   ");

        AiProductContextDTO product = buildProduct(80_000, 75_000, new BigDecimal("82000"));
        when(aiChatRepository.findProductContext(1L)).thenReturn(product);
        when(aiLlmClient.generateAnswer(anyString(), anyString()))
                .thenReturn("Gợi ý nhanh:\n- Kem: 80.000đ — tốt\nKết luận: Mua ngay.");

        String result = aiChatService.answer(req(
                "giá bây giờ thế nào?",
                1L, null,
                List.of(validUser, validAi, nullContent, blankContent)
        ));

        assertNotNull(result);
    }

    @Test
    @DisplayName("15. buildUserPrompt - role không phải 'user' -> label 'AI'")
    void answer_historyRoleAssistant_labelAI() {
        AiChatHistoryMessage aiMsg = new AiChatHistoryMessage("assistant", "Giá tốt lắm.");
        AiProductContextDTO product = buildProduct(80_000, 75_000, null);
        when(aiChatRepository.findProductContext(2L)).thenReturn(product);
        when(aiLlmClient.generateAnswer(anyString(), anyString()))
                .thenReturn("Gợi ý nhanh:\n- Kem: 80.000đ — ok\nKết luận: Cân nhắc.");

        String result = aiChatService.answer(req("có nên mua không?", 2L, null, List.of(aiMsg)));

        assertNotNull(result);
    }

    // ── generalFallbackAnswer - các nhánh keyword ────────────────────────────

    @Test
    @DisplayName("16. generalFallbackAnswer - keyword 'da khô'")
    void generalFallback_drySkinkeyword() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("kem dưỡng cho da khô loại nào tốt?", null, null, null));
        assertTrue(result.contains("hyaluronic acid") || result.contains("ceramide") || result.contains("ẩm"));
    }

    @Test
    @DisplayName("17. generalFallbackAnswer - keyword 'dưỡng ẩm'")
    void generalFallback_duongAmKeyword() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("dưỡng ẩm ban đêm nên dùng gì?", null, null, null));
        assertTrue(result.contains("ẩm") || result.contains("ceramide"));
    }

    @Test
    @DisplayName("18. generalFallbackAnswer - keyword 'kem dưỡng'")
    void generalFallback_kemDuongKeyword() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("kem dưỡng nào rẻ mà tốt?", null, null, null));
        assertTrue(result.contains("ẩm") || result.contains("B5") || result.contains("ceramide"));
    }

    @Test
    @DisplayName("19. generalFallbackAnswer - keyword 'mụn'")
    void generalFallback_acneKeyword() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("da hay nổi mụn dùng gì?", null, null, null));
        assertTrue(result.contains("niacinamide") || result.contains("BHA") || result.contains("mụn"));
    }

    @Test
    @DisplayName("20. generalFallbackAnswer - keyword 'da dầu'")
    void generalFallback_oilyKeyword() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("da dầu nên dùng sản phẩm gì?", null, null, null));
        assertTrue(result.contains("dầu") || result.contains("non-comedogenic"));
    }

    @Test
    @DisplayName("21. generalFallbackAnswer - keyword 'chống nắng'")
    void generalFallback_sunscreenKeyword() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("kem chống nắng SPF bao nhiêu là đủ?", null, null, null));
        assertTrue(result.contains("SPF") || result.contains("PA"));
    }

    @Test
    @DisplayName("22. generalFallbackAnswer - keyword 'sunscreen'")
    void generalFallback_sunscreenEnKeyword() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("sunscreen nào tốt?", null, null, null));
        assertTrue(result.contains("SPF") || result.contains("PA"));
    }

    @Test
    @DisplayName("23. generalFallbackAnswer - keyword 'tóc'")
    void generalFallback_hairKeyword() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("tóc khô xơ dùng gì?", null, null, null));
        assertTrue(result.contains("tóc") || result.contains("keratin") || result.contains("amino"));
    }

    @Test
    @DisplayName("24. generalFallbackAnswer - keyword 'dầu gội'")
    void generalFallback_shampooKeyword() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("dầu gội nào cho da đầu dầu?", null, null, null));
        assertTrue(result.contains("tóc") || result.contains("dầu gội") || result.contains("silicone"));
    }

    @Test
    @DisplayName("25. generalFallbackAnswer - keyword 'kem xả'")
    void generalFallback_conditionerKeyword() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("kem xả nào phục hồi tóc hư?", null, null, null));
        assertTrue(result.contains("tóc") || result.contains("phục hồi"));
    }

    @Test
    @DisplayName("26. generalFallbackAnswer - không match keyword nào -> default answer")
    void generalFallback_noKeyword_defaultAnswer() {
        when(aiLlmClient.generateAnswer(anyString(), anyString())).thenReturn(null);
        String result = aiChatService.answer(req("nên bắt đầu từ đâu khi chăm sóc da?", null, null, null));
        assertTrue(result.contains("wishlist") || result.contains("nhu cầu") || result.contains("dữ liệu"));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    @Test
    @DisplayName("27. normalizeAiAnswer - phủ tất cả replace patterns")
    void normalizeAiAnswer_allPatterns() {
        String raw = "Gợi ý nhanh:- A  -  B Kết luận:Ok\n\n\n\nDone";
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "normalizeAiAnswer", raw);
        assertNotNull(result);
        assertFalse(result.contains("\n\n\n"));
    }

    @Test
    @DisplayName("28. normalizeAiAnswer - input null -> trả về null")
    void normalizeAiAnswer_null() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "normalizeAiAnswer", (Object) null);
        assertNull(result);
    }

    @Test
    @DisplayName("29. normalizeAiAnswer - input blank -> trả về blank")
    void normalizeAiAnswer_blank() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "normalizeAiAnswer", "   ");
        assertNotNull(result);
    }

    @Test
    @DisplayName("30. isBadAiAnswer - null -> true")
    void isBadAiAnswer_null() {
        Boolean result = ReflectionTestUtils.invokeMethod(aiChatService, "isBadAiAnswer", (Object) null);
        assertTrue(result);
    }

    @Test
    @DisplayName("31. isBadAiAnswer - blank -> true")
    void isBadAiAnswer_blank() {
        Boolean result = ReflectionTestUtils.invokeMethod(aiChatService, "isBadAiAnswer", "   ");
        assertTrue(result);
    }

    @Test
    @DisplayName("32. isBadAiAnswer - chỉ có boilerplate ngắn -> true")
    void isBadAiAnswer_onlyBoilerplate_short() {
        Boolean result = ReflectionTestUtils.invokeMethod(aiChatService, "isBadAiAnswer", "Gợi ý nhanh: Kết luận:");
        assertTrue(result);
    }

    @Test
    @DisplayName("33. isBadAiAnswer - nội dung đủ dài -> false")
    void isBadAiAnswer_goodContent() {
        Boolean result = ReflectionTestUtils.invokeMethod(aiChatService, "isBadAiAnswer",
                "Kem CeraVe rất tốt cho da khô vì có ceramide và hyaluronic acid giúp dưỡng ẩm sâu.");
        assertFalse(result);
    }

    @Test
    @DisplayName("34. formatPrice - null -> 'chưa có giá'")
    void formatPrice_null() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "formatPrice", (Integer) null);
        assertEquals("chưa có giá", result);
    }

    @Test
    @DisplayName("35. formatPrice - số hợp lệ -> format VN")
    void formatPrice_valid() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "formatPrice", 100_000);
        assertTrue(result.contains("đ"));
    }

    @Test
    @DisplayName("36. formatDecimalPrice - null -> 'chưa có dữ liệu'")
    void formatDecimalPrice_null() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "formatDecimalPrice", (BigDecimal) null);
        assertEquals("chưa có dữ liệu", result);
    }

    @Test
    @DisplayName("37. formatDecimalPrice - có giá -> format đ")
    void formatDecimalPrice_valid() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "formatDecimalPrice", new BigDecimal("85000"));
        assertTrue(result.contains("đ"));
    }

    @Test
    @DisplayName("38. nullToUnknown - null -> 'Chưa rõ'")
    void nullToUnknown_null() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "nullToUnknown", (Object) null);
        assertEquals("Chưa rõ", result);
    }

    @Test
    @DisplayName("39. nullToUnknown - blank -> 'Chưa rõ'")
    void nullToUnknown_blank() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "nullToUnknown", "   ");
        assertEquals("Chưa rõ", result);
    }

    @Test
    @DisplayName("40. nullToUnknown - có giá trị -> trả về giá trị đó")
    void nullToUnknown_value() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "nullToUnknown", "Da dầu");
        assertEquals("Da dầu", result);
    }

    @Test
    @DisplayName("41. cleanReason - null -> default")
    void cleanReason_null() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "cleanReason", (Object) null);
        assertEquals("phù hợp với câu hỏi", result);
    }

    @Test
    @DisplayName("42. cleanReason - blank sau replace -> default")
    void cleanReason_blankAfterReplace() {
        // chuỗi chỉ chứa boilerplate bị replace hết -> blank -> fallback
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "cleanReason",
                "Cùng danh mục.Cùng thương hiệu.");
        assertFalse(result.isBlank());
    }

    @Test
    @DisplayName("43. cleanReason - các pattern replace đầy đủ")
    void cleanReason_allPatterns() {
        String input = "Cùng danh mục. Cùng thương hiệu. Phù hợp loại da. Phù hợp với câu hỏi tìm kiếm.";
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "cleanReason", input);
        assertFalse(result.contains("Cùng danh mục."));
    }

    @Test
    @DisplayName("44. cleanReason - pattern lỗi encoding (dấu hỏi)")
    void cleanReason_encodingPattern() {
        String input = "Cùng danh m?c. Cùng th??ng hi?u. Phù h?p lo?i da.";
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "cleanReason", input);
        assertFalse(result.contains("m?c"));
    }

    @Test
    @DisplayName("45. shortName - null -> 'Sản phẩm'")
    void shortName_null() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "shortName", (Object) null);
        assertEquals("Sản phẩm", result);
    }

    @Test
    @DisplayName("46. shortName - blank -> 'Sản phẩm'")
    void shortName_blank() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "shortName", "   ");
        assertEquals("Sản phẩm", result);
    }

    @Test
    @DisplayName("47. shortName - tên <= 55 ký tự -> giữ nguyên")
    void shortName_short() {
        String name = "CeraVe Moisturizing Cream";
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "shortName", name);
        assertEquals(name, result);
    }

    @Test
    @DisplayName("48. shortName - tên > 55 ký tự -> cắt + '...'")
    void shortName_long() {
        String name = "Kem Dưỡng Ẩm CeraVe Moisturizing Cream Dành Cho Da Khô Và Rất Khô 250g";
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "shortName", name);
        assertTrue(result.endsWith("..."));
        assertTrue(result.length() <= 58); // 55 + "..."
    }

    @Test
    @DisplayName("49. safeLower - null -> empty string")
    void safeLower_null() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "safeLower", (Object) null);
        assertEquals("", result);
    }

    @Test
    @DisplayName("50. safeLower - có giá trị -> lowercase")
    void safeLower_value() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "safeLower", "CeraVe");
        assertEquals("cerave", result);
    }

    // ── isWishlistQuestion ────────────────────────────────────────────────────

    @Test
    @DisplayName("51. isWishlistQuestion - null -> false")
    void isWishlistQuestion_null() {
        Boolean result = ReflectionTestUtils.invokeMethod(aiChatService, "isWishlistQuestion", (Object) null);
        assertFalse(result);
    }

    @Test
    @DisplayName("52. isWishlistQuestion - blank -> false")
    void isWishlistQuestion_blank() {
        Boolean result = ReflectionTestUtils.invokeMethod(aiChatService, "isWishlistQuestion", "   ");
        assertFalse(result);
    }

    @Test
    @DisplayName("53. isWishlistQuestion - các keyword wishlist")
    void isWishlistQuestion_keywords() {
        assertTrue((Boolean) ReflectionTestUtils.invokeMethod(aiChatService, "isWishlistQuestion", "wishlist của tôi"));
        assertTrue((Boolean) ReflectionTestUtils.invokeMethod(aiChatService, "isWishlistQuestion", "sản phẩm đã lưu"));
        assertTrue((Boolean) ReflectionTestUtils.invokeMethod(aiChatService, "isWishlistQuestion", "sản phẩm đã thêm vào giỏ"));
        assertTrue((Boolean) ReflectionTestUtils.invokeMethod(aiChatService, "isWishlistQuestion", "sản phẩm yêu thích"));
        assertTrue((Boolean) ReflectionTestUtils.invokeMethod(aiChatService, "isWishlistQuestion", "sản phẩm đã thích hôm qua"));
        assertTrue((Boolean) ReflectionTestUtils.invokeMethod(aiChatService, "isWishlistQuestion", "dựa trên sản phẩm bạn đã thêm hãy gợi ý"));
    }

    // ── isProductShoppingQuestion ─────────────────────────────────────────────

    @Test
    @DisplayName("54. isProductShoppingQuestion - null/blank -> false")
    void isProductShoppingQuestion_nullBlank() {
        assertFalse((Boolean) ReflectionTestUtils.invokeMethod(aiChatService, "isProductShoppingQuestion", (Object) null));
        assertFalse((Boolean) ReflectionTestUtils.invokeMethod(aiChatService, "isProductShoppingQuestion", ""));
    }

    @Test
    @DisplayName("55. isProductShoppingQuestion - các keyword mua hàng")
    void isProductShoppingQuestion_keywords() {
        for (String kw : List.of("gợi ý", "recommend", "sản phẩm", "mua", "nên mua",
                "giá", "deal", "sale", "rẻ", "đắt", "so sánh", "wishlist",
                "đặt alert", "kem dưỡng nào", "sữa rửa mặt nào",
                "kem chống nắng nào", "son nào", "serum nào", "dầu gội nào", "tẩy trang nào")) {
            assertTrue(
                    (Boolean) ReflectionTestUtils.invokeMethod(aiChatService, "isProductShoppingQuestion", kw),
                    "Expected true for keyword: " + kw
            );
        }
    }

    // ── extractSearchKeyword ──────────────────────────────────────────────────

    @Test
    @DisplayName("56. extractSearchKeyword - null/blank -> empty string")
    void extractSearchKeyword_nullBlank() {
        assertEquals("", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", (Object) null));
        assertEquals("", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "   "));
    }

    @Test
    @DisplayName("57. extractSearchKeyword - tất cả các nhánh keyword")
    void extractSearchKeyword_allBranches() {
        assertEquals("kem dưỡng", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "kem dưỡng tốt"));
        assertEquals("kem dưỡng", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "dưỡng ẩm ban đêm"));
        assertEquals("kem dưỡng", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "da khô dùng gì"));
        assertEquals("kem dưỡng", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "moisturizer nào tốt"));
        assertEquals("sữa rửa mặt", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "sữa rửa mặt nào rẻ"));
        assertEquals("sữa rửa mặt", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "cleanser cho da dầu"));
        assertEquals("sữa rửa mặt", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "rửa mặt buổi sáng"));
        assertEquals("chống nắng", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "kem chống nắng SPF 50"));
        assertEquals("chống nắng", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "sunscreen dạng gel"));
        assertEquals("son dưỡng", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "son dưỡng môi"));
        assertEquals("son dưỡng", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "dưỡng môi ban đêm"));
        assertEquals("son dưỡng", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "lip balm nào tốt"));
        assertEquals("tóc", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "dầu gội cho tóc dầu"));
        assertEquals("tóc", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "kem xả phục hồi tóc"));
        assertEquals("tóc", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "dầu dưỡng tóc"));
        assertEquals("tẩy trang", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "tẩy trang nước hay dầu"));
        assertEquals("serum", ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "serum vitamin c nào tốt"));
    }

    @Test
    @DisplayName("58. extractSearchKeyword - không match -> trả về message.trim()")
    void extractSearchKeyword_noMatch() {
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "extractSearchKeyword", "  xin chào  ");
        assertEquals("xin chào", result);
    }

    // ── filterRecommendationsByQuestion ──────────────────────────────────────

    @Test
    @DisplayName("59. filterRecommendations - null list -> empty")
    void filterRecs_nullList() {
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "serum nào tốt", null);
        assertTrue(((List<?>) result).isEmpty());
    }

    @Test
    @DisplayName("60. filterRecommendations - empty list -> empty")
    void filterRecs_emptyList() {
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "serum", List.of());
        assertTrue(((List<?>) result).isEmpty());
    }

    @Test
    @DisplayName("61. filterRecommendations - message null -> trả về nguyên list")
    void filterRecs_nullMessage() {
        List<AiRecommendationDTO> recs = List.of(buildRec("Kem A", "Skincare", 100_000, "ok"));
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", (String) null, recs);
        assertEquals(1, ((List<?>) result).size());
    }

    @Test
    @DisplayName("62. filterRecommendations - message blank -> trả về nguyên list")
    void filterRecs_blankMessage() {
        List<AiRecommendationDTO> recs = List.of(buildRec("Kem A", "Skincare", 100_000, "ok"));
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "   ", recs);
        assertEquals(1, ((List<?>) result).size());
    }

    @Test
    @DisplayName("63. filterRecommendations - không có intent cụ thể -> trả nguyên list")
    void filterRecs_noIntent() {
        List<AiRecommendationDTO> recs = List.of(buildRec("Kem A", "Skincare", 100_000, "ok"));
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "có gì hay không?", recs);
        assertEquals(1, ((List<?>) result).size());
    }

    @Test
    @DisplayName("64. filterRecommendations - asksMoisturizer -> lọc theo kem dưỡng")
    void filterRecs_moisturizer() {
        List<AiRecommendationDTO> recs = List.of(
                buildRec("Kem dưỡng ẩm CeraVe", "Chăm sóc da", 100_000, "ok"),
                buildRec("Dầu gội Clear", "Tóc", 80_000, "ok")
        );
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "kem dưỡng cho da khô", recs);
        assertEquals(1, ((List<?>) result).size());
    }

    @Test
    @DisplayName("65. filterRecommendations - asksCleanser -> lọc theo sữa rửa mặt")
    void filterRecs_cleanser() {
        List<AiRecommendationDTO> recs = List.of(
                buildRec("Sữa rửa mặt La Roche", "Cleanser", 150_000, "ok"),
                buildRec("Kem chống nắng Anessa", "Sunscreen", 200_000, "ok")
        );
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "sữa rửa mặt cho da dầu", recs);
        assertEquals(1, ((List<?>) result).size());
    }

    @Test
    @DisplayName("66. filterRecommendations - asksSunscreen -> lọc chống nắng")
    void filterRecs_sunscreen() {
        List<AiRecommendationDTO> recs = List.of(
                buildRec("Kem chống nắng SPF50 Anessa", "Sunscreen", 200_000, "ok"),
                buildRec("Kem dưỡng CeraVe", "Skincare", 100_000, "ok")
        );
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "kem chống nắng nào tốt?", recs);
        assertEquals(1, ((List<?>) result).size());
    }

    @Test
    @DisplayName("67. filterRecommendations - asksHair -> lọc tóc")
    void filterRecs_hair() {
        List<AiRecommendationDTO> recs = List.of(
                buildRec("Dầu gội Clear Men", "Tóc", 80_000, "ok"),
                buildRec("Serum Vitamin C", "Serum", 250_000, "ok")
        );
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "dầu gội cho da đầu dầu", recs);
        assertEquals(1, ((List<?>) result).size());
    }

    @Test
    @DisplayName("68. filterRecommendations - asksLip -> lọc son môi")
    void filterRecs_lip() {
        List<AiRecommendationDTO> recs = List.of(
                buildRec("Son dưỡng môi Vaseline", "Son môi", 50_000, "ok"),
                buildRec("Kem dưỡng CeraVe", "Skincare", 100_000, "ok")
        );
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "son dưỡng môi nào tốt?", recs);
        assertEquals(1, ((List<?>) result).size());
    }

    @Test
    @DisplayName("69. filterRecommendations - asksMakeup -> lọc trang điểm")
    void filterRecs_makeup() {
        List<AiRecommendationDTO> recs = List.of(
                buildRec("Kem nền Maybelline", "Trang điểm", 200_000, "ok"),
                buildRec("Sữa rửa mặt", "Cleanser", 100_000, "ok")
        );
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "kem nền nào che phủ tốt?", recs);
        assertEquals(1, ((List<?>) result).size());
    }

    @Test
    @DisplayName("70. filterRecommendations - asksMakeupRemover -> lọc tẩy trang")
    void filterRecs_makeupRemover() {
        List<AiRecommendationDTO> recs = List.of(
                buildRec("Nước tẩy trang Bioderma", "Tẩy trang", 150_000, "ok"),
                buildRec("Kem dưỡng", "Skincare", 100_000, "ok")
        );
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "tẩy trang nào dịu nhẹ?", recs);
        assertEquals(1, ((List<?>) result).size());
    }

    @Test
    @DisplayName("71. filterRecommendations - asksSerum -> lọc serum")
    void filterRecs_serum() {
        List<AiRecommendationDTO> recs = List.of(
                buildRec("Serum Vitamin C SkinCeuticals", "Serum", 1_500_000, "ok"),
                buildRec("Dầu gội Clear", "Tóc", 80_000, "ok")
        );
        List<?> result = ReflectionTestUtils.invokeMethod(
                aiChatService, "filterRecommendationsByQuestion", "serum vitamin c nào tốt?", recs);
        assertEquals(1, ((List<?>) result).size());
    }

    // ── buildUserPrompt - nhánh recommendations trong prompt ─────────────────

    @Test
    @DisplayName("72. buildUserPrompt - product != null + recommendations empty -> fallback prompt")
    void buildUserPrompt_productNotNull_recsEmpty() {
        AiProductContextDTO product = buildProduct(80_000, null, null);
        when(aiChatRepository.findProductContext(3L)).thenReturn(product);
        when(aiLlmClient.generateAnswer(anyString(), anyString()))
                .thenReturn("Gợi ý nhanh:\n- Kem: 80.000đ — tốt\nKết luận: Mua đi.");

        String result = aiChatService.answer(req("sản phẩm này thế nào?", 3L, null, null));

        assertNotNull(result);
    }

    @Test
    @DisplayName("73. normalizeAiAnswer - pattern 'Gợi ý nhanh: -' (có space)")
    void normalizeAiAnswer_patternWithSpace() {
        String raw = "Gợi ý nhanh: - Kem A: 100.000đ\nKết luận:Mua đi.";
        String result = (String) ReflectionTestUtils.invokeMethod(aiChatService, "normalizeAiAnswer", raw);
        assertTrue(result.contains("Gợi ý nhanh:"));
        assertTrue(result.contains("Kem A"));
    }
}