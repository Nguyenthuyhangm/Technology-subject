package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels.DealScoreCalculation;
import com.pricehawl.dto.TrendingDealModels.TrendingDealDTO;
import com.pricehawl.dto.TrendingDealModels.TrendingDealResponse;
import com.pricehawl.dto.TrendingDealModels.TrendingDealsSnapshot;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.exception.TrendingDealsComputationException;
import com.pricehawl.repository.TrendingDealRepositories.TrendingDealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrendingDealService {

   // Số lượng ID lấy ra trong mỗi lần chọc vào DB (giảm xuống để query nhanh)
    private static final int TRENDING_CANDIDATE_SLICE_SIZE = 50; 

    // Tổng số lượng Listing tối đa sẽ mang đi "phẫu thuật" tính điểm (Quan trọng nhất)
    // Sửa từ 3000 -> 100 để Server chỉ phải tính toán 100 món tốt nhất
    private static final int TRENDING_MAX_CANDIDATE_LISTINGS = 100; 

    // Số lượng lịch sử giá lấy về cho mỗi Listing để check Fake Promo
    // 400 là quá nhiều cho biểu đồ nhỏ, 50-100 là đủ để thấy biến động rồi
    public static final int MAX_PRICE_RECORDS_PER_LISTING = 50; 

    // Số lượng Deal cuối cùng hiển thị lên màn hình điện thoại/web
    private static final int MAX_TRENDING_DEALS_RETURN = 20;

    private final TrendingDealRepository trendingDealRepository;
    private final TrendingDealTxBatchRunner txBatchRunner;

    /**
     * TỐI ƯU: Chạy ngầm mỗi 60 phút để nạp sẵn Cache.
     */
    @Scheduled(fixedRate = 3600000) 
    public void autoWarmTrendingCache() {
        log.info("🚀 [Scheduler] Đang nạp sẵn Cache cho Trending Deals...");
        try {
            this.refreshTrendingDealsSnapshot(false);
            this.refreshTrendingDealsSnapshot(true);
            log.info("✅ [Scheduler] Nạp Cache hoàn tất.");
        } catch (Exception e) {
            log.error("❌ [Scheduler] Lỗi nạp Cache: {}", e.getMessage());
        }
    }

    /**
     * SỬA LỖI: Chuyển sang public static để TrendingDealTxBatchRunner có thể gọi được.
     */
    public static Comparator<TrendingDealDTO> dedupRepresentativeComparator() {
        return Comparator
                .comparingDouble((TrendingDealDTO d) -> d.listing() != null && d.listing().getTrustScore() != null
                        ? d.listing().getTrustScore()
                        : 0.0)
                .thenComparingInt(d -> {
                    PriceRecord latest = d.latestPriceRecord();
                    Integer p = latest != null ? latest.getPrice() : null;
                    return p == null ? Integer.MAX_VALUE : p;
                });
    }

    public TrendingDealsSnapshot getTrendingDealsSnapshot(boolean expand, boolean refresh) {
        return refresh ? refreshTrendingDealsSnapshot(expand) : getTrendingDealsSnapshotCached(expand);
    }

    @Cacheable(cacheNames = "trendingDeals", key = "#expand")
    public TrendingDealsSnapshot getTrendingDealsSnapshotCached(boolean expand) {
        return buildSnapshot(expand);
    }

    @Caching(
            evict = @CacheEvict(cacheNames = "trendingDeals", key = "#expand"),
            put = @CachePut(cacheNames = "trendingDeals", key = "#expand")
    )
    public TrendingDealsSnapshot refreshTrendingDealsSnapshot(boolean expand) {
        return buildSnapshot(expand);
    }

    private TrendingDealsSnapshot buildSnapshot(boolean expand) {
        try {
            return buildSnapshotUnsafe(expand);
        } catch (TrendingDealsComputationException e) {
            throw e;
        } catch (RuntimeException e) {
            log.error("Trending failed", e);
            throw new TrendingDealsComputationException("Đang cập nhật dữ liệu...", e);
        }
    }

    private TrendingDealsSnapshot buildSnapshotUnsafe(boolean expand) {
        Instant computedAt = Instant.now();
        LocalDateTime priceSince = LocalDateTime.now().minusDays(TrendingDealEngine.PRICE_LOOKBACK_DAYS_FOR_CANDIDATE_EXISTS);

        Pageable pageable = PageRequest.of(0, TRENDING_CANDIDATE_SLICE_SIZE, Sort.by(Sort.Order.desc("isPinned"), Sort.Order.desc("updatedAt")));
        Map<UUID, TrendingDealDTO> bestByProduct = new HashMap<>();
        Map<UUID, PriceConflictStats> priceStatsByProduct = new HashMap<>();

        int totalScanned = 0;
        while (true) {
            Slice<UUID> slice = trendingDealRepository.findTrendingCandidateIdsSlice(TrendingDealEngine.REQUIRED_TRUST_SCORE_EXACT, priceSince, pageable);
            List<UUID> ids = slice.getContent();
            if (ids == null || ids.isEmpty()) break;

            txBatchRunner.processBatch(ids, priceSince, bestByProduct, priceStatsByProduct);
            totalScanned += ids.size();

            if (!slice.hasNext() || totalScanned >= TRENDING_MAX_CANDIDATE_LISTINGS) break;
            pageable = slice.nextPageable();
        }

        List<TrendingDealResponse> body = bestByProduct.values().stream()
                .filter(Objects::nonNull)
                .sorted(trendingSortComparator())
                .limit(MAX_TRENDING_DEALS_RETURN)
                .map(d -> mapToResponse(d, priceStatsByProduct.get(d.listing().getProduct().getId()).isConflict()))
                .filter(Objects::nonNull)
                .toList();

        return new TrendingDealsSnapshot(body, computedAt, TrendingDealEngine.SNAPSHOT_CACHE_TTL_SECONDS);
    }

    private TrendingDealResponse mapToResponse(TrendingDealDTO dto, boolean hasConflict) {
        if (dto == null || dto.listing() == null) return null;
        ProductListing l = dto.listing();
        PriceRecord latest = dto.latestPriceRecord();
        
        float discount = TrendingDealEngine.calculateDisplayDiscountPct(latest);
        String explanation = TrendingDealEngine.Explanations.forDeal(l, dto.score(), discount, latest);
        
        TrendingDealResponse res = TrendingDealResponse.builder()
                .listingId(l.getId())
                .productId(l.getProduct().getId())
                .productName(l.getProduct().getName())
                .imageUrl(l.getProduct().getImageUrl() != null ? l.getProduct().getImageUrl() : l.getPlatformImageUrl())
                .platformName(l.getPlatform() != null ? l.getPlatform().getName() : l.getPlatformName())
                .currentPrice(latest != null ? latest.getPrice() : null)
                .originalPrice(latest != null ? latest.getOriginalPrice() : null)
                .discountPercent(discount)
                .dealScore(dto.score().totalDealScore())
                .badge(TrendingDealEngine.computeBadge(Boolean.TRUE.equals(l.getIsPinned()), discount))
                .explanation(explanation)
                .isPinned(Boolean.TRUE.equals(l.getIsPinned()))
                .isFakePromo(TrendingDealEngine.isLikelyFakePromo(dto.priceRecordsDesc()))
                .priceConflict(hasConflict)
                .build();
        
        if (hasConflict) res.setPriceConflictMessage("Có chênh lệch giá giữa các sàn");
        return res;
    }

    private static Comparator<TrendingDealDTO> trendingSortComparator() {
        return Comparator.comparing((TrendingDealDTO d) -> Boolean.TRUE.equals(d.listing().getIsPinned()), Comparator.reverseOrder())
                .thenComparing((TrendingDealDTO d) -> TrendingDealEngine.platformDiscountPct(d.latestPriceRecord()), Comparator.reverseOrder())
                .thenComparing(d -> d.score().totalDealScore(), Comparator.reverseOrder());
    }

    public static final class PriceConflictStats {
        private Integer minPrice;
        private Integer maxPrice;
        public void observe(Integer p) {
            if (p == null || p <= 0) return;
            if (minPrice == null || p < minPrice) minPrice = p;
            if (maxPrice == null || p > maxPrice) maxPrice = p;
        }
        public boolean isConflict() {
            return minPrice != null && maxPrice != null && ((maxPrice - minPrice) / (double) minPrice * 100.0) >= 7.0;
        }
    }
}