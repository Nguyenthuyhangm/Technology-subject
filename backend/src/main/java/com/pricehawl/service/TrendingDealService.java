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

    // Slice/batch: tránh N+1 + tránh transaction dài.
    private static final int TRENDING_CANDIDATE_SLICE_SIZE = 1000;   // 800~1200 theo yêu cầu
    private static final int TRENDING_MAX_CANDIDATE_LISTINGS = 3000; // tăng để giảm bỏ sót

    // Fetch PriceRecord theo batch, rồi cắt top N per listing trong service.
    static final int MAX_PRICE_RECORDS_PER_LISTING = 400;
    private static final int MAX_TRENDING_DEALS_RETURN = 100;

    private final TrendingDealRepository trendingDealRepository;
    private final TrendingDealTxBatchRunner txBatchRunner;

    
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
            log.error("Trending snapshot computation failed (expand={})", expand, e);
            throw new TrendingDealsComputationException(
                    "Hệ thống đang cập nhật dữ liệu trending, vui lòng thử lại sau.", e);
        }
    }

    private TrendingDealsSnapshot buildSnapshotUnsafe(boolean expand) {
        Instant computedAt = Instant.now();

        // Pre-filter ở DB: platform active + trustScore + EXISTS PriceRecord 60 ngày.
        LocalDateTime priceSince = LocalDateTime.now()
                .minusDays(TrendingDealEngine.PRICE_LOOKBACK_DAYS_FOR_CANDIDATE_EXISTS);

        Pageable pageable = PageRequest.of(
                0,
                TRENDING_CANDIDATE_SLICE_SIZE,
                Sort.by(Sort.Order.desc("isPinned"), Sort.Order.desc("updatedAt")));

        // Giảm memory: giữ best-per-product + stats xung đột giá, không giữ toàn bộ 240k PriceRecord.
        Map<UUID, TrendingDealDTO> bestByProduct = new HashMap<>();
        Map<UUID, PriceConflictStats> priceStatsByProduct = new HashMap<>();

        int totalCandidatesScanned = 0;
        int batchNo = 0;

        while (true) {
            Slice<UUID> slice = trendingDealRepository.findTrendingCandidateIdsSlice(
                    TrendingDealEngine.REQUIRED_TRUST_SCORE_EXACT,
                    priceSince,
                    pageable);

            List<UUID> candidateIds = slice.getContent();
            if (candidateIds == null || candidateIds.isEmpty()) {
                break;
            }

            batchNo++;
            totalCandidatesScanned += candidateIds.size();

            TrendingDealTxBatchRunner.BatchOutcome outcome = txBatchRunner.processBatch(
                    candidateIds,
                    priceSince,
                    bestByProduct,
                    priceStatsByProduct);

            log.info("Trending batch#{} candidates={} eligible={} productsSoFar={}",
                    batchNo,
                    outcome.candidates(),
                    outcome.eligible(),
                    bestByProduct.size());

            if (!slice.hasNext()) {
                break;
            }
            if (totalCandidatesScanned >= TRENDING_MAX_CANDIDATE_LISTINGS) {
                log.info("Trending stop early: scannedCandidates={} (max={})",
                        totalCandidatesScanned,
                        TRENDING_MAX_CANDIDATE_LISTINGS);
                break;
            }

            pageable = slice.nextPageable();
        }

        if (bestByProduct.isEmpty()) {
            return new TrendingDealsSnapshot(
                    List.of(),
                    computedAt,
                    TrendingDealEngine.SNAPSHOT_CACHE_TTL_SECONDS);
        }

        List<TrendingDealDTO> representatives = bestByProduct.values().stream()
                .filter(Objects::nonNull)
                .sorted(trendingSortComparator())
                .limit(MAX_TRENDING_DEALS_RETURN)
                .toList();

        Map<UUID, Boolean> priceConflictByProduct = new HashMap<>(priceStatsByProduct.size());
        for (Map.Entry<UUID, PriceConflictStats> e : priceStatsByProduct.entrySet()) {
            priceConflictByProduct.put(e.getKey(), e.getValue() != null && e.getValue().isConflict());
        }

        List<TrendingDealResponse> body;
    
        body = representatives.stream()
                .map(d -> {
                    try {
                        if (d == null || d.listing() == null || d.listing().getProduct() == null) {
                            return null;
                        }
                        UUID pid = d.listing().getProduct().getId();
                        return mapToResponse(d, pid != null ? priceConflictByProduct.get(pid) : Boolean.FALSE);
                    } catch (Exception ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();

        return new TrendingDealsSnapshot(
                body,
                computedAt,
                TrendingDealEngine.SNAPSHOT_CACHE_TTL_SECONDS);
    }

    private TrendingDealResponse mapToResponse(ProductListing l, DealScoreCalculation calc, PriceRecord latest) {
        if (l == null) {
            return null;
        }
        Integer currentPrice = latest != null ? latest.getPrice() : null;
        Integer originalPrice = latest != null ? latest.getOriginalPrice() : null;
        // IMPORTANT: Display mới tính lại từ originalPrice/price để hiển thị đúng % (không dùng để filter).
        float discountPct = TrendingDealEngine.calculateDisplayDiscountPct(latest);
        boolean flashSale = latest != null && Boolean.TRUE.equals(latest.getIsFlashSale());

        boolean pinned = Boolean.TRUE.equals(l.getIsPinned());
        String badge = TrendingDealEngine.computeBadge(pinned, discountPct);

        String explanation = TrendingDealEngine.Explanations.forDeal(l, calc, discountPct, latest);

        // Ưu tiên ảnh gốc của product; nếu thiếu thì fallback sang ảnh của listing.
        String imageUrl = null;
        if (l.getProduct() != null && l.getProduct().getImageUrl() != null && !l.getProduct().getImageUrl().isEmpty()) {
            imageUrl = l.getProduct().getImageUrl();
        } else if (l.getPlatformImageUrl() != null && !l.getPlatformImageUrl().isEmpty()) {
            imageUrl = l.getPlatformImageUrl();
        }

        UUID productId = l.getProduct() != null ? l.getProduct().getId() : null;
        String productName = l.getProduct() != null ? l.getProduct().getName() : null;

        DealScoreCalculation safeCalc = calc != null ? calc : DealScoreCalculation.zero();

        return TrendingDealResponse.builder()
                .listingId(l.getId())
                .productId(productId)
                .productName(productName)
                .imageUrl(imageUrl)
                .platformName(l.getPlatform() != null && l.getPlatform().getName() != null
                        ? l.getPlatform().getName()
                        : (l.getPlatformName() != null ? l.getPlatformName() : ""))
                .currentPrice(currentPrice)
                .originalPrice(originalPrice)
                .discountPercent(discountPct)
                .isFlashSale(flashSale)
                .dealScore(safeCalc.totalDealScore())
                .badge(badge)
                .explanation(explanation)
                .isPinned(pinned)
                .discountScore(safeCalc.discountScore())
                .trustScore(safeCalc.trustScore())
                .freshnessScore(safeCalc.freshnessScore())
                .build();
    }

    private TrendingDealResponse mapToResponse(TrendingDealDTO dto, Boolean priceConflict) {
        if (dto == null) {
            return null;
        }
        TrendingDealResponse res =
                mapToResponse(dto.listing(), dto.score(), dto.latestPriceRecord());
        if (res == null) {
            return null;
        }
        boolean conflict = Boolean.TRUE.equals(priceConflict);
        res.setPriceConflict(conflict);
        res.setPriceConflictMessage(conflict ? "Có chênh lệch giá giữa các shop/sàn" : null);
        if (res.getExplanation() == null || res.getExplanation().trim().length() < TrendingDealEngine.MIN_EXPLANATION_LENGTH) {
            res.setExplanation((res.getExplanation() == null ? "" : res.getExplanation().trim())
                    + " Có chênh lệch giá giữa các shop/sàn, hãy so sánh kỹ trước khi mua.");
        }
        return res;
    }

    static Comparator<TrendingDealDTO> dedupRepresentativeComparator() {
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

    private static Comparator<TrendingDealDTO> trendingSortComparator() {
        return Comparator
                // isPinned: true lên trước
                .comparing((TrendingDealDTO d) -> d.listing() != null && Boolean.TRUE.equals(d.listing().getIsPinned()),
                        Comparator.reverseOrder())
                // discountPct cao hơn (ưu tiên trước)
                .thenComparing((TrendingDealDTO d) -> {
                    PriceRecord latest = d.latestPriceRecord();
                    if (latest == null) return 0.0;
                    return TrendingDealEngine.platformDiscountPct(latest);
                }, Comparator.reverseOrder())
                // nếu cùng discountPct, ưu tiên flash sale
                .thenComparing((TrendingDealDTO d) -> {
                    PriceRecord latest = d.latestPriceRecord();
                    return latest != null && Boolean.TRUE.equals(latest.getIsFlashSale());
                }, Comparator.reverseOrder())
                // totalDealScore cao hơn
                .thenComparing((TrendingDealDTO d) -> d.score().totalDealScore(), Comparator.reverseOrder())
                // discountScore cao hơn
                .thenComparing((TrendingDealDTO d) -> d.score().discountScore(), Comparator.reverseOrder())
                // trustScore cao hơn
                .thenComparing((TrendingDealDTO d) -> d.score().trustScore(), Comparator.reverseOrder())
                // nếu cùng sản phẩm, ưu tiên price thấp hơn
                .thenComparing(d -> {
                    PriceRecord latest = d.latestPriceRecord();
                    Integer p = latest != null ? latest.getPrice() : null;
                    return p == null ? Integer.MAX_VALUE : p;
                });
    }



    static final class PriceConflictStats {
        private Integer minPrice;
        private Integer maxPrice;

        void observe(Integer price) {
            if (price == null || price <= 0) {
                return;
            }
            if (minPrice == null || price < minPrice) {
                minPrice = price;
            }
            if (maxPrice == null || price > maxPrice) {
                maxPrice = price;
            }
        }

        boolean isConflict() {
            if (minPrice == null || maxPrice == null) {
                return false;
            }
            if (minPrice <= 0) {
                return false;
            }
            double diffPct = (maxPrice - minPrice) / (double) minPrice * 100.0;
            return diffPct >= 7.0;
        }
    }
}
