package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels.DealScoreCalculation;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

public final class TrendingDealEngine {

    // DealScore = 0.55 * DiscountScore + 0.25 * TrustScore + 0.2 * FreshnessScore
    private static final double W_DISCOUNT = 0.55;
    private static final double W_TRUST = 0.25;
    private static final double W_FRESH = 0.20;

    private TrendingDealEngine() {
    }

    public static final long SNAPSHOT_CACHE_TTL_SECONDS = 2L * 60 * 60;
    public static final int MIN_EXPLANATION_LENGTH = 40;
    public static final String STATUS_ACTIVE = "ACTIVE";
    private static final float MIN_DISCOUNT_PCT_EXCLUSIVE = 10.0f;
    // IMPORTANT: Trending yêu cầu trustScore = 1.0 (không >=, không fallback).
    public static final double REQUIRED_TRUST_SCORE_EXACT = 1.0;
    public static final int PRICE_LOOKBACK_DAYS_FOR_CANDIDATE_EXISTS = 60;

    // Badge thresholds giữ nguyên theo yêu cầu.
    public static final float BADGE_HOT_MIN_DISCOUNT_PCT_INCLUSIVE = 30f;
    public static final float BADGE_DEAL_MIN_DISCOUNT_PCT_EXCLUSIVE = 20f;

    public static final double FAKE_PROMO_DEEP_DISCOUNT_PCT = 72.0;
    public static final double FAKE_PROMO_HISTORICAL_LOW_DISCOUNT_PCT = 18.0;
    public static final int FAKE_PROMO_RECENT_WINDOW_DAYS = 2;
    public static final double FAKE_PROMO_INFLATED_ORIGINAL_RATIO = 1.28;
    public static final double FAKE_PROMO_INFLATED_PAIR_DISCOUNT_PCT = 45.0;
    public static final double FAKE_PROMO_FLAT_CV_MAX = 0.05;
    public static final double FAKE_PROMO_CLIFF_DROP_FROM_MEAN_PCT = 35.0;
    public static final double FAKE_PROMO_FLASH_EXTREME_DISCOUNT_PCT = 78.0;
    public static final int FAKE_PROMO_STEEP_DROP_STEP_PCT = 10;
    public static final int FAKE_PROMO_MAX_STEEP_DROPS = 4;
    public static final double FAKE_PROMO_LOW_TRUST_CAP = 0.62;
    public static final double FAKE_PROMO_LOW_TRUST_DEEP_DISCOUNT_PCT = 65.0;

    public static boolean passesCoreListingRules(ProductListing p) {
        if (p == null) {
            return false;
        }
        return p.getPlatform() == null || !Boolean.FALSE.equals(p.getPlatform().getIsActive());
    }

    public static boolean hasInStockLatest(PriceRecord latest) {
        return latest != null && Boolean.TRUE.equals(latest.getInStock());
    }

    public static boolean isEligibleForTrending(
            ProductListing p,
            List<PriceRecord> recs) {

        PriceRecord latest = latest(recs);
        return passesCoreListingRules(p)
                && hasInStockLatest(latest)
                && !isLikelyFakePromo(recs);
    }

    public static boolean isEligibleOrganic(
            ProductListing listing,
            List<PriceRecord> recsDesc) {

        
        try {
            if (listing == null || !passesCoreListingRules(listing)) {
                return false;
            }

            PriceRecord latest = latest(recsDesc);
            if (latest == null) {
                return false;
            }
            // - PriceRecord: discountPct > 10%, inStock == true, isFlashSale null-safe
            // - ProductListing: trustScore >= 0.50
            if (!hasInStockLatest(latest)) {
                return false;
            }
            // FreshnessScore bắt buộc → cần crawledAt hợp lệ để tính freshness tier.
            if (latest.getCrawledAt() == null) {
                return false;
            }

            
            boolean flashSale = Boolean.TRUE.equals(latest.getIsFlashSale());
            if (flashSale && latest.getPrice() == null) {
                return false;
            }

            // IMPORTANT: Filter dùng discountPct GỐC từ DB (không fallback) để loại deal giá ảo.
            float storedDiscount = calculateStoredDiscountPct(latest);
            if (!(storedDiscount > MIN_DISCOUNT_PCT_EXCLUSIVE)) {
                return false;
            }

            Double trustRaw = listing.getTrustScore();
            if (trustRaw == null) {
                return false;
            }
            double trust = trustRaw;
            if (Double.isNaN(trust) || Double.isInfinite(trust)) {
                return false;
            }
            return Double.compare(trust, REQUIRED_TRUST_SCORE_EXACT) == 0;
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    /**
     * IMPORTANT: Chỉ dùng discountPct gốc trong DB (không fallback, không tự tính lại).
     * Dùng ở phase filter để loại deal giá ảo / dữ liệu originalPrice bị inflate.
     */
    public static float calculateStoredDiscountPct(PriceRecord latest) {
        if (latest == null) {
            return 0f;
        }
        Float db = latest.getDiscountPct();
        if (db == null) {
            return 0f;
        }
        if (Float.isNaN(db) || Float.isInfinite(db)) {
            return 0f;
        }
        return Math.max(0f, Math.min(100f, db));
    }

    /**
     * Display-only: tính lại % giảm từ originalPrice/price để hiển thị đúng cho UI (không dùng để filter).
     */
    public static float calculateDisplayDiscountPct(PriceRecord latest) {
        if (latest == null) {
            return 0f;
        }
        Integer o = latest.getOriginalPrice();
        Integer price = latest.getPrice();
        if (o == null || o <= 0 || price == null || price <= 0) {
            return 0f;
        }
        double raw = (1.0 - price / (double) o) * 100.0;
        double clamped = Math.max(0.0, Math.min(100.0, raw));
        return (float) Math.round(clamped);
    }

    /**
     * Badge logic (giữ nguyên): PINNED → HOT(>=30%) → DEAL(>20%) → TRENDING.
     */
    public static String computeBadge(boolean pinned, float discountPct) {
        if (pinned) {
            return "PINNED";
        }
        if (discountPct >= BADGE_HOT_MIN_DISCOUNT_PCT_INCLUSIVE) {
            return "HOT";
        }
        if (discountPct > BADGE_DEAL_MIN_DISCOUNT_PCT_EXCLUSIVE) {
            return "DEAL";
        }
        return "TRENDING";
    }

    public static boolean isLikelyFakePromo(List<PriceRecord> raw) {
        if (raw == null || raw.size() < 3) {
            return false;
        }

        List<PriceRecord> sorted = raw.stream()
                .filter(r -> r != null && r.getCrawledAt() != null)
                .sorted(Comparator.comparing(PriceRecord::getCrawledAt))
                .toList();
        if (sorted.size() < 3) {
            return false;
        }

        PriceRecord latest = sorted.get(sorted.size() - 1);
        double latestDisc = platformDiscountPct(latest);
        LocalDateTime anchor = latest.getCrawledAt();
        LocalDateTime recentCutoff = anchor.minusDays(FAKE_PROMO_RECENT_WINDOW_DAYS);

        if (suddenDeepDiscountAfterQuietHistory(sorted, latestDisc, recentCutoff)) {
            return true;
        }
        if (inflatedOriginalPricePattern(sorted, latestDisc)) {
            return true;
        }
        if (flatHistoryThenCliff(sorted, latest)) {
            return true;
        }
        if (Boolean.TRUE.equals(latest.getIsFlashSale())
                && latestDisc >= FAKE_PROMO_FLASH_EXTREME_DISCOUNT_PCT) {
            return true;
        }
        if (tooManySteepDrops(sorted)) {
            return true;
        }
        return false;
    }

    /**
     * Legacy/Scoring: hàm này vẫn giữ nguyên (có fallback) để không đổi hành vi scoring/sort cũ.
     */
    static double platformDiscountPct(PriceRecord r) {
        if (r == null) {
            return 0.0;
        }
        Integer o = r.getOriginalPrice();
        Integer price = r.getPrice();

        //  ưu tiên tự tính khi có đủ originalPrice và currentPrice hợp lệ.
        if (o != null && o > 0 && price != null && price > 0) {
            double raw = (1.0 - price / (double) o) * 100.0;
            double clamped = Math.max(0.0, Math.min(100.0, raw));
            return Math.round(clamped);
        }

        // Chỉ dùng discountPct từ DB khi originalPrice thiếu hoặc không hợp lệ.
        Float db = r.getDiscountPct();
        if (db != null && db >= 0) {
            double clamped = Math.max(0.0, Math.min(100.0, db));
            return Math.round(clamped);
        }

        return 0.0;
    }

    private static boolean suddenDeepDiscountAfterQuietHistory(
            List<PriceRecord> sorted,
            double latestDisc,
            LocalDateTime recentCutoff) {

        if (latestDisc < FAKE_PROMO_DEEP_DISCOUNT_PCT) {
            return false;
        }
        List<PriceRecord> older = new ArrayList<>();
        for (PriceRecord r : sorted) {
            if (r.getCrawledAt().isBefore(recentCutoff)) {
                older.add(r);
            }
        }
        if (older.isEmpty()) {
            return false;
        }
        double avgOlder = older.stream().mapToDouble(TrendingDealEngine::platformDiscountPct).average().orElse(0);
        return avgOlder < FAKE_PROMO_HISTORICAL_LOW_DISCOUNT_PCT;
    }

    private static boolean inflatedOriginalPricePattern(List<PriceRecord> sorted, double latestDisc) {
        if (latestDisc < FAKE_PROMO_INFLATED_PAIR_DISCOUNT_PCT) {
            return false;
        }
        int n = sorted.size();
        if (n < 6) {
            return false;
        }
        int third = Math.max(1, n / 3);
        double medOld = medianOriginal(sorted.subList(0, third));
        double medNew = medianOriginal(sorted.subList(n - third, n));
        if (medOld <= 0 || medNew <= 0) {
            return false;
        }
        return medNew / medOld >= FAKE_PROMO_INFLATED_ORIGINAL_RATIO;
    }

    private static boolean flatHistoryThenCliff(List<PriceRecord> sorted, PriceRecord latest) {
        int n = sorted.size();
        if (n < 4) {
            return false;
        }
        int earlyEnd = Math.max(2, (int) Math.ceil(n * 0.7));
        List<PriceRecord> early = sorted.subList(0, earlyEnd);
        double mean = early.stream().mapToInt(PriceRecord::getPrice).average().orElse(0);
        if (mean <= 0) {
            return false;
        }
        double std = stdDevPrices(early);
        double cv = std / mean;
        if (cv > FAKE_PROMO_FLAT_CV_MAX) {
            return false;
        }
        int lastPrice = latest.getPrice();
        double threshold = mean * (1.0 - FAKE_PROMO_CLIFF_DROP_FROM_MEAN_PCT / 100.0);
        return lastPrice < threshold;
    }

    private static boolean tooManySteepDrops(List<PriceRecord> sorted) {
        int steep = 0;
        double step = 1.0 - FAKE_PROMO_STEEP_DROP_STEP_PCT / 100.0;
        for (int i = 1; i < sorted.size(); i++) {
            int p0 = sorted.get(i - 1).getPrice();
            int p1 = sorted.get(i).getPrice();
            if (p0 > 0 && p1 < p0 * step) {
                steep++;
            }
        }
        return steep >= FAKE_PROMO_MAX_STEEP_DROPS;
    }

    private static double medianOriginal(List<PriceRecord> segment) {
        List<Integer> vals = segment.stream()
                .map(PriceRecord::getOriginalPrice)
                .filter(Objects::nonNull)
                .filter(v -> v > 0)
                .sorted()
                .toList();
        if (vals.isEmpty()) {
            return 0.0;
        }
        int mid = vals.size() / 2;
        if (vals.size() % 2 == 1) {
            return vals.get(mid);
        }
        return (vals.get(mid - 1) + vals.get(mid)) / 2.0;
    }

    private static double stdDevPrices(List<PriceRecord> segment) {
        if (segment.size() < 2) {
            return 0.0;
        }
        double mean = segment.stream().mapToInt(PriceRecord::getPrice).average().orElse(0);
        double var = segment.stream()
                .mapToDouble(pr -> {
                    double d = pr.getPrice() - mean;
                    return d * d;
                })
                .average()
                .orElse(0);
        return Math.sqrt(var);
    }

    /* --- Historical discount --- */

    public record HistoricalDiscountResult(int referencePrice, int currentPrice, float discountPercent) {
    }

    public static HistoricalDiscountResult computeHistoricalDiscount(List<PriceRecord> recordsDesc) {
        PriceRecord latest = latest(recordsDesc);
        if (latest == null) {
            return new HistoricalDiscountResult(0, 0, 0f);
        }
        int current = latest.getPrice() != null ? latest.getPrice() : 0;
        List<PriceRecord> sorted = recordsAsc(recordsDesc);
        if (sorted.isEmpty()) {
            return new HistoricalDiscountResult(0, current, 0f);
        }
        int n = sorted.size();
        int excludeRecent = Math.max(1, Math.min(n - 1, (int) Math.ceil(n * 0.2)));
        List<Integer> refPrices = new ArrayList<>();
        for (int i = 0; i < n - excludeRecent; i++) {
            Integer p = sorted.get(i).getPrice();
            if (p != null && p > 0) {
                refPrices.add(p);
            }
        }
        if (refPrices.isEmpty()) {
            for (int i = 0; i < n - 1; i++) {
                Integer p = sorted.get(i).getPrice();
                if (p != null && p > 0) {
                    refPrices.add(p);
                }
            }
        }
        int reference = medianInt(refPrices);
        if (reference <= 0) {
            reference = current > 0 ? current : 0;
        }
        if (reference <= 0 || current <= 0) {
            return new HistoricalDiscountResult(reference, current, 0f);
        }
        double raw = (reference - current) / (double) reference * 100.0;
        float pct = (float) Math.max(0.0, Math.min(100.0, raw));
        return new HistoricalDiscountResult(reference, current, pct);
    }

    private static int medianInt(List<Integer> values) {
        if (values.isEmpty()) {
            return 0;
        }
        List<Integer> copy = new ArrayList<>(values);
        copy.sort(Integer::compareTo);
        int mid = copy.size() / 2;
        if (copy.size() % 2 == 1) {
            return copy.get(mid);
        }
        return (copy.get(mid - 1) + copy.get(mid)) / 2;
    }

    /* --- Scoring --- */

    public static DealScoreCalculation score(
            ProductListing listing,
            List<PriceRecord> recordsDesc) {

        PriceRecord latest = latest(recordsDesc);
        if (latest == null) {
            return DealScoreCalculation.zero();
        }

        double discountScore = Math.min(1.0, Math.max(0.0, platformDiscountPct(latest) / 100.0));

        double trustScore = normalizeTrust(listing != null ? listing.getTrustScore() : null);
        double freshnessScore = calculateFreshnessTiered(latest.getCrawledAt());
        double total = W_DISCOUNT * discountScore
                + W_TRUST * trustScore
                + W_FRESH * freshnessScore;

        return new DealScoreCalculation(discountScore, trustScore, freshnessScore, total);
    }

    private static double normalizeTrust(Double trust) {
        if (trust == null) {
            return 0.0;
        }
        if (Double.isNaN(trust) || Double.isInfinite(trust)) {
            return 0.0;
        }
        return Math.max(0.0, Math.min(1.0, trust));
    }

    private static double calculateFreshnessTiered(LocalDateTime crawlTime) {
        if (crawlTime == null) {
            return 0.0;
        }
        long minutes = ChronoUnit.MINUTES.between(crawlTime, LocalDateTime.now());
        if (minutes < 0) {
            minutes = 0;
        }
        if (minutes < 2L * 60) {       // < 2 giờ
            return 1.00;
        }
        if (minutes < 6L * 60) {       // 2–6 giờ
            return 0.80;
        }
        if (minutes < 12L * 60) {      // 6–12 giờ
            return 0.60;
        }
        return 0.40;                   // >= 12 giờ
    }

    public static final class Explanations {
        private static final DateTimeFormatter VI_TIME =
                DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", new Locale("vi", "VN"));

        private Explanations() {
        }

        public static String forDeal(
                ProductListing listing,
                DealScoreCalculation calc,
                float realDiscountPct,
                PriceRecord latest) {

            String line1 = String.format(Locale.ROOT,
                    "Giảm khoảng %.0f%% so với giá gốc hiện tại.",
                    realDiscountPct);
            String line2 = latest != null && latest.getCrawledAt() != null
                    ? "Cập nhật giá gần nhất: " + VI_TIME.format(latest.getCrawledAt()) + '.'
                    : "Cập nhật giá gần nhất: —";
            return (line1 + "\n" + line2).trim();
        }
    }

    public static PriceRecord latest(List<PriceRecord> recordsDesc) {
        if (recordsDesc == null || recordsDesc.isEmpty()) {
            return null;
        }
        return recordsDesc.stream()
                .filter(r -> r != null && r.getCrawledAt() != null)
                .max(Comparator.comparing(PriceRecord::getCrawledAt))
                .orElse(null);
    }

    public static List<PriceRecord> recordsAsc(List<PriceRecord> recordsDesc) {
        if (recordsDesc == null || recordsDesc.isEmpty()) {
            return List.of();
        }
        return recordsDesc.stream()
                .filter(r -> r != null && r.getCrawledAt() != null && r.getPrice() != null)
                .sorted(Comparator.comparing(PriceRecord::getCrawledAt))
                .toList();
    }
}
