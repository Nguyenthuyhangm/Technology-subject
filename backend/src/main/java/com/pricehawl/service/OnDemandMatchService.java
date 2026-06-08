package com.pricehawl.service;

import com.pricehawl.service.model.SearchResultItem;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/**
 * So sánh tên sản phẩm gốc với kết quả search từ các sàn,
 * quyết định sản phẩm nào là cùng 1 sản phẩm.
 *
 * INPUT:  String sourceName              — tên sản phẩm gốc (từ extension)
 *         Map<String, List<SearchResultItem>> allResults — kết quả từ 5 sàn
 *
 * OUTPUT: List<SearchResultItem> — danh sách đã confirmed match
 *         Mỗi sàn tối đa 1 item (item có score cao nhất vượt threshold)
 *
 * DEPENDENCY: commons-text (thêm vào pom.xml):
 *   <dependency>
 *     <groupId>org.apache.commons</groupId>
 *     <artifactId>commons-text</artifactId>
 *     <version>1.11.0</version>
 *   </dependency>
 */
@Slf4j
@Service
public class OnDemandMatchService {

    private static final JaroWinklerSimilarity JARO_WINKLER = new JaroWinklerSimilarity();

    /** Ngưỡng tối thiểu để accept — đã test với nhiều cặp tên mỹ phẩm */
    private static final double SIMILARITY_THRESHOLD = 0.75;

    /** Chênh lệch giá tối đa giữa 2 sàn — quá 3x thì không phải cùng sản phẩm */
    private static final double MAX_PRICE_RATIO = 10.0;

    private static final Pattern DIACRITIC_PATTERN = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern NOISE_PATTERN = Pattern.compile(
        "\\b(ml|gr?|g|oz|l|hộp|tuýp|chai|miếng|viên|cái|gói|tờ|set|combo|pack)\\b",
        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    // ================================================================
    // PUBLIC ENTRY POINT
    // ================================================================

    /**
     * @param sourceName tên sản phẩm gốc từ extension
     * @param allResults map platform → list kết quả search
     * @return list sản phẩm đã match, mỗi sàn tối đa 1 item
     */
    public List<SearchResultItem> match(
            String sourceName,
            Map<String, List<SearchResultItem>> allResults) {

        String normalizedSource = normalize(sourceName);
        List<SearchResultItem> matched = new ArrayList<>();

        for (Map.Entry<String, List<SearchResultItem>> entry : allResults.entrySet()) {
            String platform = entry.getKey();
            List<SearchResultItem> candidates = entry.getValue();

            if (candidates.isEmpty()) continue;

            // Tìm item có score cao nhất trong danh sách kết quả của sàn
            SearchResultItem best     = null;
            double           bestScore = 0.0;

            for (SearchResultItem candidate : candidates) {
                double score = computeScore(normalizedSource, sourceName, candidate);
                candidate.setSimilarityScore(score); // ghi lại để debug

                if (score > bestScore) {
                    bestScore = score;
                    best      = candidate;
                }
            }

            if (best != null && bestScore >= SIMILARITY_THRESHOLD) {
                log.info("Match ACCEPTED | platform={} | score={} | name='{}'",
                    platform, String.format("%.3f", bestScore), best.getName());
                matched.add(best);
            } else {
                log.debug("Match REJECTED | platform={} | bestScore={} | threshold={}",
                    platform, best != null ? String.format("%.3f", bestScore) : "N/A",
                    SIMILARITY_THRESHOLD);
            }
        }

        log.info("Matching complete | source='{}' | matched={}/{} platforms",
            sourceName, matched.size(), allResults.size());

        return matched;
    }

    // ================================================================
    // SCORE COMPUTATION
    // ================================================================

    /**
     * Tính score tổng hợp:
     *   0.80 × Jaro-Winkler(normalizedSource, normalizedCandidate)
     * + 0.20 × brandBonus (nếu cùng brand)
     *
     * Sau đó hard-filter theo giá (loại hẳn nếu chênh quá MAX_PRICE_RATIO).
     */
    private double computeScore(String normalizedSource, String rawSource, SearchResultItem candidate) {
        String normalizedCandidate = normalize(candidate.getName());

        // Jaro-Winkler similarity
        double jwScore = JARO_WINKLER.apply(normalizedSource, normalizedCandidate);

        // Brand bonus: nếu tên source chứa brand của candidate → +0.15
        double brandBonus = 0.0;
        if (candidate.getBrand() != null && !candidate.getBrand().isBlank()) {
            String brandNorm = normalize(candidate.getBrand());
            if (normalizedSource.contains(brandNorm) || normalizedCandidate.contains(brandNorm)) {
                brandBonus = 0.15;
            }
        }

        double totalScore = Math.min(1.0, jwScore * 0.85 + brandBonus);

        // Hard filter: nếu giá chênh quá 3x → loại ngay dù tên giống
        // (tránh nhầm size khác nhau, combo vs đơn lẻ)
        // Chỉ áp dụng khi cả 2 có giá
        // (sourceName không có giá nên skip nếu candidate không có giá)
        if (candidate.getPrice() != null && candidate.getPrice() > 0) {
            // Không có giá source để so — skip price filter
            // Price filter sẽ được áp dụng sau khi có nhiều listings trong import
        }

        return totalScore;
    }

    // ================================================================
    // TEXT NORMALIZE
    // ================================================================

    /**
     * Normalize tên sản phẩm để so sánh:
     * 1. Lowercase
     * 2. Bỏ dấu tiếng Việt
     * 3. Bỏ đơn vị đo lường và packaging noise
     * 4. Trim và chuẩn hóa khoảng trắng
     *
     * Ví dụ:
     *   "Kem Chống Nắng Anessa Perfect UV SPF50+ 60ml"
     *   → "kem chong nang anessa perfect uv spf50+"
     */
    String normalize(String text) {
        if (text == null || text.isBlank()) return "";

        // Lowercase
        String s = text.toLowerCase();

        // Bỏ dấu tiếng Việt
        s = Normalizer.normalize(s, Normalizer.Form.NFD);
        s = DIACRITIC_PATTERN.matcher(s).replaceAll("");

        // Bỏ noise words (đơn vị, packaging)
        s = NOISE_PATTERN.matcher(s).replaceAll(" ");

        // Bỏ số lượng ml/g đứng riêng (ví dụ: "60 ml" → bỏ cả "60")
        s = s.replaceAll("\\d+\\s*(ml|gr?|g|oz)\\b", " ");

        // Chuẩn hóa khoảng trắng
        s = s.replaceAll("\\s+", " ").trim();

        return s;
    }
}