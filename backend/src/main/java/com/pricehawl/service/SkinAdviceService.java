package com.pricehawl.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricehawl.dto.AiRecommendationDTO;
import com.pricehawl.dto.SkinAdviceRequest;
import com.pricehawl.dto.SkinAdviceResponse;
import com.pricehawl.dto.SkinRoutineStepProductDTO;
import com.pricehawl.entity.SkinAdviceTemplate;
import com.pricehawl.entity.UserSkinReport;
import com.pricehawl.repository.AiChatRepository;
import com.pricehawl.repository.SkinAdviceTemplateRepository;
import com.pricehawl.repository.UserSkinReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SkinAdviceService {

    private static final String SIGNATURE_VERSION = "skin-advice-v6-skin-type-products";

    private final SkinAdviceTemplateRepository templateRepository;
    private final UserSkinReportRepository reportRepository;
    private final AiChatRepository aiChatRepository;
    private final AiLlmClient aiLlmClient;
    private final ObjectMapper objectMapper;

    public SkinAdviceResponse analyzeOrGet(SkinAdviceRequest request) {
        String signature = buildSignature(request);
        String hash = sha256(signature);

        SkinAdviceTemplate template = templateRepository
                .findBySignatureHash(hash)
                .orElse(null);

        boolean cached = template != null;

        if (template == null) {
            List<SkinRoutineStepProductDTO> morningProducts = buildMorningProducts(request);
            List<SkinRoutineStepProductDTO> nightProducts = buildNightProducts(request);

            List<AiRecommendationDTO> allProducts = collectAllProducts(
                    morningProducts,
                    nightProducts
            );

            String aiAnswer = aiLlmClient.generateAnswer(
                    buildSystemPrompt(),
                    buildUserPrompt(request, morningProducts, nightProducts)
            );

            template = buildTemplateFromAi(
                    request,
                    hash,
                    aiAnswer,
                    allProducts,
                    morningProducts,
                    nightProducts
            );

            template = templateRepository.save(template);
        }

        UserSkinReport report = UserSkinReport.builder()
                .userId(request.userId())
                .templateId(template.getId())
                .build();

        report = reportRepository.save(report);

        RoutineProducts routineProducts = parseRoutineProducts(template.getRoutineProductsJson());

        return new SkinAdviceResponse(
                report.getId(),
                template.getId(),
                cached,
                template.getSummary(),
                template.getMorningRoutine(),
                template.getNightRoutine(),
                template.getRecommendedProducts(),
                template.getWarningNotes(),
                routineProducts.morning(),
                routineProducts.night()
        );
    }

    private List<SkinRoutineStepProductDTO> buildMorningProducts(SkinAdviceRequest request) {
        List<SkinRoutineStepProductDTO> result = new ArrayList<>();
        Set<UUID> usedProductIds = new HashSet<>();

        AiRecommendationDTO cleanser = findFirstProduct(
                "sữa rửa mặt",
                request,
                usedProductIds
        );
        if (cleanser != null) {
            result.add(toStep(
                    "morning",
                    "cleanser",
                    "Rửa mặt",
                    cleanser,
                    buildReasonBySkinType(request, "rửa mặt")
            ));
        }

        AiRecommendationDTO serum = findFirstProduct(
                chooseSerumKeyword(request),
                request,
                usedProductIds
        );
        if (serum != null) {
            result.add(toStep(
                    "morning",
                    "serum",
                    "Serum",
                    serum,
                    buildReasonBySkinType(request, "serum")
            ));
        }

        AiRecommendationDTO moisturizer = findFirstProduct(
                chooseMoisturizerKeyword(request),
                request,
                usedProductIds
        );
        if (moisturizer != null) {
            result.add(toStep(
                    "morning",
                    "moisturizer",
                    "Dưỡng ẩm",
                    moisturizer,
                    buildReasonBySkinType(request, "dưỡng ẩm")
            ));
        }

        AiRecommendationDTO sunscreen = findFirstProduct(
                "chống nắng",
                request,
                usedProductIds
        );
        if (sunscreen != null) {
            result.add(toStep(
                    "morning",
                    "sunscreen",
                    "Chống nắng",
                    sunscreen,
                    buildReasonBySkinType(request, "chống nắng")
            ));
        }

        return result;
    }

    private List<SkinRoutineStepProductDTO> buildNightProducts(SkinAdviceRequest request) {
        List<SkinRoutineStepProductDTO> result = new ArrayList<>();
        Set<UUID> usedProductIds = new HashSet<>();

        AiRecommendationDTO remover = findFirstProduct(
                "tẩy trang",
                request,
                usedProductIds
        );
        if (remover != null) {
            result.add(toStep(
                    "night",
                    "makeup_remover",
                    "Tẩy trang",
                    remover,
                    buildReasonBySkinType(request, "tẩy trang")
            ));
        }

        AiRecommendationDTO cleanser = findFirstProduct(
                "sữa rửa mặt",
                request,
                usedProductIds
        );
        if (cleanser != null) {
            result.add(toStep(
                    "night",
                    "cleanser",
                    "Rửa mặt",
                    cleanser,
                    buildReasonBySkinType(request, "rửa mặt")
            ));
        }

        AiRecommendationDTO treatment = findTreatmentProduct(request, usedProductIds);
        if (treatment != null) {
            result.add(toStep(
                    "night",
                    "treatment",
                    "Treatment",
                    treatment,
                    buildReasonBySkinType(request, "treatment")
            ));
        }

        AiRecommendationDTO moisturizer = findFirstProduct(
                chooseMoisturizerKeyword(request),
                request,
                usedProductIds
        );
        if (moisturizer != null) {
            result.add(toStep(
                    "night",
                    "moisturizer",
                    "Dưỡng ẩm phục hồi",
                    moisturizer,
                    buildReasonBySkinType(request, "dưỡng ẩm")
            ));
        }

        return result;
    }

    private AiRecommendationDTO findFirstProduct(
            String stepKeyword,
            SkinAdviceRequest request,
            Set<UUID> usedProductIds
    ) {
        List<AiRecommendationDTO> products =
                aiChatRepository.findProductsForRoutineStep(
                        stepKeyword,
                        normalizeSkinTypeForDb(request.skinType()),
                        chooseConcernKeyword(request),
                        chooseGoalKeyword(request),
                        10
                );

        if (products == null || products.isEmpty()) {
            return null;
        }

        for (AiRecommendationDTO product : products) {
            if (product.getProductId() == null) {
                continue;
            }

            if (!usedProductIds.contains(product.getProductId())) {
                usedProductIds.add(product.getProductId());
                return product;
            }
        }

        return null;
    }

    private AiRecommendationDTO findTreatmentProduct(
            SkinAdviceRequest request,
            Set<UUID> usedProductIds
    ) {
        String concerns = normalize(request.mainConcerns());
        String goals = normalize(request.skinGoals());

        if (concerns.contains("mụn") || goals.contains("mụn")) {
            AiRecommendationDTO acne = findFirstProduct(
                    "mụn",
                    request,
                    usedProductIds
            );

            if (acne != null) {
                return acne;
            }
        }

        if (concerns.contains("thâm") || goals.contains("sáng")) {
            AiRecommendationDTO brightening = findFirstProduct(
                    "sáng",
                    request,
                    usedProductIds
            );

            if (brightening != null) {
                return brightening;
            }
        }

        if (concerns.contains("đỏ") || concerns.contains("rát") || goals.contains("phục hồi")) {
            AiRecommendationDTO repair = findFirstProduct(
                    "phục hồi",
                    request,
                    usedProductIds
            );

            if (repair != null) {
                return repair;
            }
        }

        return findFirstProduct(
                "serum",
                request,
                usedProductIds
        );
    }

    private SkinRoutineStepProductDTO toStep(
            String routineTime,
            String stepKey,
            String stepLabel,
            AiRecommendationDTO product,
            String reason
    ) {
        return SkinRoutineStepProductDTO.builder()
                .routineTime(routineTime)
                .stepKey(stepKey)
                .stepLabel(stepLabel)
                .productId(product.getProductId())
                .productName(product.getProductName())
                .brandName(product.getBrandName())
                .categoryName(product.getCategoryName())
                .imageUrl(product.getImageUrl())
                .lowestPrice(product.getLowestPrice())
                .reason(reason)
                .build();
    }

    private List<AiRecommendationDTO> collectAllProducts(
            List<SkinRoutineStepProductDTO> morning,
            List<SkinRoutineStepProductDTO> night
    ) {
        Map<UUID, AiRecommendationDTO> map = new LinkedHashMap<>();

        addStepProductsToMap(map, morning);
        addStepProductsToMap(map, night);

        return new ArrayList<>(map.values());
    }

    private void addStepProductsToMap(
            Map<UUID, AiRecommendationDTO> map,
            List<SkinRoutineStepProductDTO> steps
    ) {
        if (steps == null) {
            return;
        }

        for (SkinRoutineStepProductDTO step : steps) {
            if (step.getProductId() == null || map.containsKey(step.getProductId())) {
                continue;
            }

            map.put(step.getProductId(), new StepProductProjection(step));
        }
    }

    private String buildSystemPrompt() {
        return """
            Bạn là PriceHawk AI, chuyên tạo báo cáo skincare cá nhân hóa.

            Quy tắc bắt buộc:
            - Không chẩn đoán bệnh da liễu.
            - Không thay thế bác sĩ.
            - Backend đã chọn sẵn sản phẩm thật trong hệ thống PriceHawk cho từng bước routine.
            - Không tự bịa thêm sản phẩm.
            - Không đổi tên sản phẩm.
            - Chỉ viết tóm tắt, routine và lưu ý dựa trên tình trạng da.
            - Routine phải giải thích đúng theo các bước đã được cung cấp.
            - Trả lời đúng format:

            TỔNG QUAN DA:
            ...

            TÓM TẮT:
            ...

            ROUTINE SÁNG:
            - Bước 1:
            - Bước 2:
            - Bước 3:

            ROUTINE TỐI:
            - Bước 1:
            - Bước 2:
            - Bước 3:

            SẢN PHẨM GỢI Ý:
            Viết ngắn: các sản phẩm đã được gắn vào từng bước routine, xem chi tiết trong thẻ sản phẩm.

            NÊN TRÁNH:
            ...

            LƯU Ý:
            ...
            """;
    }

    private String buildUserPrompt(
            SkinAdviceRequest request,
            List<SkinRoutineStepProductDTO> morningProducts,
            List<SkinRoutineStepProductDTO> nightProducts
    ) {
        StringBuilder sb = new StringBuilder();

        sb.append("Thông tin tình trạng da người dùng:\n");
        sb.append("- Loại da: ").append(safe(request.skinType())).append("\n");
        sb.append("- Mức nhạy cảm: ").append(safe(request.sensitivityLevel())).append("\n");
        sb.append("- Mức mụn: ").append(safe(request.acneLevel())).append("\n");
        sb.append("- Vấn đề chính: ").append(safe(request.mainConcerns())).append("\n");
        sb.append("- Mục tiêu: ").append(safe(request.skinGoals())).append("\n");
        sb.append("- Dị ứng/thành phần cần tránh: ").append(safe(request.allergies())).append("\n");
        sb.append("- Sản phẩm đang dùng: ").append(safe(request.currentProducts())).append("\n");
        sb.append("- Ngân sách: ")
                .append(request.budgetMin() == null ? "không rõ" : request.budgetMin())
                .append(" - ")
                .append(request.budgetMax() == null ? "không rõ" : request.budgetMax())
                .append("đ\n\n");

        sb.append("Sản phẩm thật đã được backend chọn cho ROUTINE SÁNG:\n");
        appendRoutineSteps(sb, morningProducts);

        sb.append("\nSản phẩm thật đã được backend chọn cho ROUTINE TỐI:\n");
        appendRoutineSteps(sb, nightProducts);

        sb.append("""
            
            Hãy tạo báo cáo skincare cá nhân hóa theo đúng format.
            Không tự thêm sản phẩm ngoài danh sách trên.
            """);

        return sb.toString();
    }

    private void appendRoutineSteps(
            StringBuilder sb,
            List<SkinRoutineStepProductDTO> steps
    ) {
        if (steps == null || steps.isEmpty()) {
            sb.append("- Chưa có sản phẩm phù hợp trong hệ thống.\n");
            return;
        }

        for (SkinRoutineStepProductDTO step : steps) {
            sb.append("- Bước: ").append(step.getStepLabel()).append("\n");
            sb.append("  Product ID: ").append(step.getProductId()).append("\n");
            sb.append("  Tên: ").append(step.getProductName()).append("\n");
            sb.append("  Brand: ").append(step.getBrandName()).append("\n");
            sb.append("  Category: ").append(step.getCategoryName()).append("\n");
            sb.append("  Giá: ").append(step.getLowestPrice()).append("đ\n");
            sb.append("  Lý do: ").append(step.getReason()).append("\n\n");
        }
    }

    private SkinAdviceTemplate buildTemplateFromAi(
            SkinAdviceRequest request,
            String hash,
            String aiAnswer,
            List<AiRecommendationDTO> products,
            List<SkinRoutineStepProductDTO> morningProducts,
            List<SkinRoutineStepProductDTO> nightProducts
    ) {
        if (aiAnswer == null || aiAnswer.isBlank()) {
            aiAnswer = fallbackAdvice();
        }

        return SkinAdviceTemplate.builder()
                .signatureHash(hash)
                .skinType(request.skinType())
                .sensitivityLevel(request.sensitivityLevel())
                .acneLevel(request.acneLevel())
                .mainConcerns(request.mainConcerns())
                .skinGoals(request.skinGoals())
                .allergies(request.allergies())
                .currentProducts(request.currentProducts())
                .budgetMin(request.budgetMin())
                .budgetMax(request.budgetMax())
                .recommendedProductIds(toProductIdCsv(products))
                .routineProductsJson(toRoutineProductsJson(morningProducts, nightProducts))
                .hydrationScore(estimateHydrationScore(request))
                .barrierScore(estimateBarrierScore(request))
                .sensitivityScore(estimateSensitivityScore(request))
                .skinOverview(extractSection(aiAnswer, "TỔNG QUAN DA:", "TÓM TẮT:"))
                .summary(extractSection(aiAnswer, "TÓM TẮT:", "ROUTINE SÁNG:"))
                .morningRoutine(extractSection(aiAnswer, "ROUTINE SÁNG:", "ROUTINE TỐI:"))
                .nightRoutine(extractSection(aiAnswer, "ROUTINE TỐI:", "SẢN PHẨM GỢI Ý:"))
                .recommendedProducts(extractSection(aiAnswer, "SẢN PHẨM GỢI Ý:", "NÊN TRÁNH:"))
                .avoidNotes(extractSection(aiAnswer, "NÊN TRÁNH:", "LƯU Ý:"))
                .warningNotes(extractSection(aiAnswer, "LƯU Ý:", null))
                .build();
    }

    private String toRoutineProductsJson(
            List<SkinRoutineStepProductDTO> morning,
            List<SkinRoutineStepProductDTO> night
    ) {
        try {
            Map<String, Object> map = Map.of(
                    "morning", morning == null ? List.of() : morning,
                    "night", night == null ? List.of() : night
            );

            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }

    private RoutineProducts parseRoutineProducts(String json) {
        if (json == null || json.isBlank()) {
            return new RoutineProducts(List.of(), List.of());
        }

        try {
            Map<String, List<SkinRoutineStepProductDTO>> map =
                    objectMapper.readValue(
                            json,
                            new TypeReference<Map<String, List<SkinRoutineStepProductDTO>>>() {
                            }
                    );

            return new RoutineProducts(
                    map.getOrDefault("morning", List.of()),
                    map.getOrDefault("night", List.of())
            );
        } catch (Exception e) {
            return new RoutineProducts(List.of(), List.of());
        }
    }

    private String extractSection(String text, String start, String end) {
        if (text == null || text.isBlank()) {
            return "";
        }

        int startIndex = text.indexOf(start);
        if (startIndex < 0) {
            return "";
        }

        startIndex += start.length();

        int endIndex = end == null ? text.length() : text.indexOf(end, startIndex);
        if (endIndex < 0) {
            endIndex = text.length();
        }

        return text.substring(startIndex, endIndex).trim();
    }

    private String toProductIdCsv(List<AiRecommendationDTO> products) {
        if (products == null || products.isEmpty()) {
            return "";
        }

        return products.stream()
                .map(item -> item.getProductId() == null ? "" : item.getProductId().toString())
                .filter(id -> !id.isBlank())
                .distinct()
                .reduce((a, b) -> a + "," + b)
                .orElse("");
    }

    private Integer estimateHydrationScore(SkinAdviceRequest request) {
        String text = normalize(request.skinType()) + " " + normalize(request.mainConcerns());

        if (text.contains("khô") || text.contains("bong tróc") || text.contains("thiếu ẩm")) {
            return 55;
        }

        if (text.contains("dầu")) {
            return 72;
        }

        return 68;
    }

    private Integer estimateBarrierScore(SkinAdviceRequest request) {
        String text = normalize(request.mainConcerns()) + " " + normalize(request.skinGoals());

        if (text.contains("đỏ") || text.contains("rát") || text.contains("kích ứng") || text.contains("phục hồi")) {
            return 58;
        }

        return 76;
    }

    private Integer estimateSensitivityScore(SkinAdviceRequest request) {
        String sensitivity = normalize(request.sensitivityLevel());

        if (sensitivity.contains("cao")) {
            return 82;
        }

        if (sensitivity.contains("trung bình")) {
            return 55;
        }

        return 30;
    }

    private String normalizeSkinTypeForDb(String skinType) {
        String value = normalize(skinType);

        if (value.contains("khô")) {
            return "khô";
        }

        if (value.contains("dầu")) {
            return "dầu";
        }

        if (value.contains("nhạy cảm")) {
            return "nhạy cảm";
        }

        if (value.contains("hỗn hợp")) {
            return "hỗn hợp";
        }

        if (value.contains("thường")) {
            return "thường";
        }

        return value;
    }

    private String chooseConcernKeyword(SkinAdviceRequest request) {
        String concerns = normalize(request.mainConcerns());
        String acneLevel = normalize(request.acneLevel());

        if (concerns.contains("mụn") || acneLevel.contains("nhẹ")
                || acneLevel.contains("vừa") || acneLevel.contains("nặng")) {
            return "mụn";
        }

        if (concerns.contains("thâm")) {
            return "thâm";
        }

        if (concerns.contains("đỏ") || concerns.contains("rát") || concerns.contains("kích ứng")) {
            return "nhạy cảm";
        }

        if (concerns.contains("bong tróc") || concerns.contains("khô")) {
            return "dưỡng ẩm";
        }

        if (concerns.contains("lỗ chân lông")) {
            return "lỗ chân lông";
        }

        return "";
    }

    private String chooseGoalKeyword(SkinAdviceRequest request) {
        String goals = normalize(request.skinGoals());

        if (goals.contains("phục hồi")) {
            return "phục hồi";
        }

        if (goals.contains("cấp ẩm") || goals.contains("dưỡng ẩm")) {
            return "dưỡng ẩm";
        }

        if (goals.contains("giảm mụn") || goals.contains("mụn")) {
            return "mụn";
        }

        if (goals.contains("sáng") || goals.contains("thâm")) {
            return "sáng";
        }

        if (goals.contains("chống lão hóa")) {
            return "lão hóa";
        }

        return "";
    }

    private String chooseSerumKeyword(SkinAdviceRequest request) {
        String concerns = normalize(request.mainConcerns());
        String goals = normalize(request.skinGoals());

        if (concerns.contains("mụn") || goals.contains("mụn")) {
            return "mụn";
        }

        if (concerns.contains("thâm") || goals.contains("sáng")) {
            return "sáng";
        }

        if (concerns.contains("khô") || goals.contains("cấp ẩm") || goals.contains("dưỡng ẩm")) {
            return "serum";
        }

        if (concerns.contains("đỏ") || concerns.contains("rát") || goals.contains("phục hồi")) {
            return "phục hồi";
        }

        return "serum";
    }

    private String chooseMoisturizerKeyword(SkinAdviceRequest request) {
        String skinType = normalize(request.skinType());
        String concerns = normalize(request.mainConcerns());
        String goals = normalize(request.skinGoals());

        if (skinType.contains("dầu") || concerns.contains("mụn")) {
            return "gel dưỡng";
        }

        if (skinType.contains("khô") || concerns.contains("bong tróc")
                || goals.contains("phục hồi") || goals.contains("dưỡng ẩm")) {
            return "kem dưỡng";
        }

        if (skinType.contains("nhạy cảm")) {
            return "phục hồi";
        }

        return "kem dưỡng";
    }

    private String buildReasonBySkinType(SkinAdviceRequest request, String step) {
        String skinType = normalize(request.skinType());
        String concerns = normalize(request.mainConcerns());
        String goals = normalize(request.skinGoals());

        if (skinType.contains("khô")) {
            if (step.contains("dưỡng")) {
                return "Ưu tiên cấp ẩm và giảm khô căng cho da khô.";
            }

            if (step.contains("rửa mặt")) {
                return "Làm sạch dịu nhẹ để tránh làm da khô căng hơn.";
            }

            if (step.contains("chống nắng")) {
                return "Bảo vệ da ban ngày, hạn chế da khô yếu hơn do UV.";
            }
        }

        if (skinType.contains("dầu")) {
            if (step.contains("rửa mặt")) {
                return "Hỗ trợ làm sạch dầu thừa nhưng không nên làm sạch quá mức.";
            }

            if (step.contains("dưỡng")) {
                return "Ưu tiên kết cấu nhẹ để giảm bí da cho da dầu.";
            }

            if (step.contains("treatment")) {
                return "Hỗ trợ kiểm soát mụn và dầu thừa nếu dùng đúng tần suất.";
            }
        }

        if (skinType.contains("nhạy cảm")) {
            return "Ưu tiên sản phẩm dịu nhẹ, hạn chế kích ứng và hỗ trợ phục hồi hàng rào da.";
        }

        if (concerns.contains("mụn")) {
            return "Hỗ trợ chăm sóc da mụn, nên bắt đầu nhẹ nhàng để tránh kích ứng.";
        }

        if (goals.contains("phục hồi")) {
            return "Phù hợp mục tiêu phục hồi và củng cố hàng rào bảo vệ da.";
        }

        return "Phù hợp với bước routine và tình trạng da đã nhập.";
    }

    private String fallbackAdvice() {
        return """
            TỔNG QUAN DA:
            Da cần routine đơn giản, ưu tiên làm sạch dịu nhẹ, cấp ẩm, phục hồi hàng rào bảo vệ da và chống nắng đều đặn.

            TÓM TẮT:
            Routine nên bắt đầu nhẹ nhàng, tránh dùng quá nhiều treatment cùng lúc. Các sản phẩm đã được gắn theo từng bước routine.

            ROUTINE SÁNG:
            - Bước 1: Rửa mặt dịu nhẹ.
            - Bước 2: Dưỡng ẩm hoặc serum cấp ẩm nếu phù hợp.
            - Bước 3: Dùng kem chống nắng vào ban ngày.

            ROUTINE TỐI:
            - Bước 1: Tẩy trang nếu có chống nắng hoặc trang điểm.
            - Bước 2: Rửa mặt dịu nhẹ.
            - Bước 3: Treatment nhẹ nếu cần, sau đó dưỡng ẩm phục hồi.

            SẢN PHẨM GỢI Ý:
            Các sản phẩm đã được hiển thị theo từng bước routine bằng thẻ sản phẩm.

            NÊN TRÁNH:
            Tránh tẩy da chết quá nhiều, treatment mạnh, sản phẩm có cồn khô hoặc hương liệu mạnh nếu da dễ kích ứng.

            LƯU Ý:
            Nếu da đỏ rát, bong tróc kéo dài hoặc mụn viêm nặng, nên hỏi bác sĩ da liễu.
            """;
    }

    private String buildSignature(SkinAdviceRequest request) {
        return SIGNATURE_VERSION + "|"
                + normalize(request.skinType()) + "|"
                + normalize(request.sensitivityLevel()) + "|"
                + normalize(request.acneLevel()) + "|"
                + normalize(request.mainConcerns()) + "|"
                + normalize(request.skinGoals()) + "|"
                + normalize(request.allergies()) + "|"
                + normalizeBudget(request.budgetMin(), request.budgetMax());
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value
                .trim()
                .toLowerCase()
                .replaceAll("\\s+", " ");
    }

    private String normalizeBudget(Integer min, Integer max) {
        int minValue = min == null ? 0 : min;
        int maxValue = max == null ? 0 : max;
        return minValue + "-" + maxValue;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encoded = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encoded);
        } catch (Exception e) {
            throw new RuntimeException("Không thể tạo hash tình trạng da", e);
        }
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "không rõ" : value;
    }

    private record RoutineProducts(
            List<SkinRoutineStepProductDTO> morning,
            List<SkinRoutineStepProductDTO> night
    ) {
    }

    private record StepProductProjection(
            UUID productId,
            String productName,
            String brandName,
            String categoryName,
            String imageUrl,
            Integer lowestPrice,
            Integer score,
            String reason
    ) implements AiRecommendationDTO {

        StepProductProjection(SkinRoutineStepProductDTO step) {
            this(
                    step.getProductId(),
                    step.getProductName(),
                    step.getBrandName(),
                    step.getCategoryName(),
                    step.getImageUrl(),
                    step.getLowestPrice(),
                    0,
                    step.getReason()
            );
        }

        @Override
        public UUID getProductId() {
            return productId;
        }

        @Override
        public String getProductName() {
            return productName;
        }

        @Override
        public String getBrandName() {
            return brandName;
        }

        @Override
        public String getCategoryName() {
            return categoryName;
        }

        @Override
        public String getImageUrl() {
            return imageUrl;
        }

        @Override
        public Integer getLowestPrice() {
            return lowestPrice;
        }

        @Override
        public Integer getScore() {
            return score;
        }

        @Override
        public String getReason() {
            return reason;
        }
    }
}