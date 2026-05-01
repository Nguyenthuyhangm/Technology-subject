package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels.DealScoreCalculation;
import com.pricehawl.dto.TrendingDealModels.TrendingDealDTO;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.TrendingDealRepositories.PriceRecordRepository;
import com.pricehawl.repository.TrendingDealRepositories.TrendingDealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class TrendingDealTxBatchRunner {

    // Chia nhỏ IN clause để tránh query/param quá lớn.
    private static final int SUB_BATCH_IN_SIZE = 400;

    private final TrendingDealRepository trendingDealRepository;
    private final PriceRecordRepository priceRecordRepository;

    public record BatchOutcome(int candidates, int eligible) {
    }

    @Transactional(readOnly = true, timeout = 45)
    public BatchOutcome processBatch(
            List<UUID> candidateListingIds,
            LocalDateTime priceSince,
            Map<UUID, TrendingDealDTO> bestByProduct,
            Map<UUID, TrendingDealService.PriceConflictStats> priceStatsByProduct) {

        if (candidateListingIds == null || candidateListingIds.isEmpty()) {
            return new BatchOutcome(0, 0);
        }

        Map<UUID, ProductListing> listingById = fetchListings(candidateListingIds);
        Map<UUID, List<PriceRecord>> priceRecordsByListingId =
                fetchPriceRecordsCapped(candidateListingIds, priceSince, TrendingDealService.MAX_PRICE_RECORDS_PER_LISTING);

        int eligible = 0;

        // Duyệt theo thứ tự candidateListingIds để ổn định hành vi (sort cuối vẫn theo comparator).
        for (UUID listingId : candidateListingIds) {
            if (listingId == null) {
                continue;
            }
            ProductListing listing = listingById.get(listingId);
            if (listing == null || listing.getId() == null || listing.getProduct() == null || listing.getProduct().getId() == null) {
                continue;
            }

            try {
                List<PriceRecord> recsDesc = priceRecordsByListingId.getOrDefault(listingId, List.of());
                if (!TrendingDealEngine.isEligibleOrganic(listing, recsDesc)) {
                    continue;
                }

                DealScoreCalculation calc = TrendingDealEngine.score(listing, recsDesc);
                PriceRecord latest = TrendingDealEngine.latest(recsDesc);
                TrendingDealDTO dto = new TrendingDealDTO(listing, calc, latest, recsDesc);
                eligible++;

                UUID productId = listing.getProduct().getId();

                TrendingDealService.PriceConflictStats stats =
                        priceStatsByProduct.computeIfAbsent(productId, k -> new TrendingDealService.PriceConflictStats());
                stats.observe(latest != null ? latest.getPrice() : null);

                TrendingDealDTO currentBest = bestByProduct.get(productId);
                if (currentBest == null) {
                    bestByProduct.put(productId, dto);
                } else {
                    TrendingDealDTO chosen = TrendingDealService.dedupRepresentativeComparator().compare(currentBest, dto) >= 0
                            ? currentBest
                            : dto;
                    bestByProduct.put(productId, chosen);
                }
            } catch (RuntimeException ex) {
                log.warn("Skip trending candidate listingId={} due to error: {}", listingId, ex.toString());
            }
        }

        return new BatchOutcome(candidateListingIds.size(), eligible);
    }

    private Map<UUID, ProductListing> fetchListings(List<UUID> listingIds) {
        Map<UUID, ProductListing> out = new HashMap<>(Math.max(16, listingIds.size() * 2));
        for (List<UUID> chunk : partition(listingIds, SUB_BATCH_IN_SIZE)) {
            List<ProductListing> listings = trendingDealRepository.findAllWithProductAndPlatformByIdIn(chunk);
            if (listings == null || listings.isEmpty()) {
                continue;
            }
            for (ProductListing l : listings) {
                if (l == null || l.getId() == null) {
                    continue;
                }
                out.put(l.getId(), l);
            }
        }
        return out;
    }

    private Map<UUID, List<PriceRecord>> fetchPriceRecordsCapped(
            List<UUID> listingIds,
            LocalDateTime since,
            int capPerListing) {

        return mergeChunkedPriceRecords(listingIds, since, capPerListing);
    }

    private Map<UUID, List<PriceRecord>> mergeChunkedPriceRecords(
            List<UUID> listingIds,
            LocalDateTime since,
            int capPerListing) {

        Map<UUID, List<PriceRecord>> out = new HashMap<>(Math.max(16, listingIds.size() * 2));

        for (List<UUID> chunk : partition(listingIds, SUB_BATCH_IN_SIZE)) {
            List<PriceRecord> rows = priceRecordRepository
                    .findLatestPriceRecordsByListingIdsInCapped(chunk, since, capPerListing);
            if (rows == null || rows.isEmpty()) {
                continue;
            }
            Map<UUID, List<PriceRecord>> grouped = rows.stream()
                    .filter(pr -> pr != null
                            && pr.getProductListing() != null
                            && pr.getProductListing().getId() != null)
                    .collect(Collectors.groupingBy(pr -> pr.getProductListing().getId()));

            for (Map.Entry<UUID, List<PriceRecord>> e : grouped.entrySet()) {
                UUID lid = e.getKey();
                if (lid == null) {
                    continue;
                }
                List<PriceRecord> bucket = out.computeIfAbsent(lid, k -> new ArrayList<>(Math.min(32, capPerListing)));
                List<PriceRecord> add = e.getValue();
                if (add == null || add.isEmpty()) {
                    continue;
                }
                // Thực tế đã capped từ DB, nhưng vẫn bảo vệ để không vượt cap nếu merge nhiều chunk.
                for (PriceRecord pr : add) {
                    if (bucket.size() >= capPerListing) {
                        break;
                    }
                    bucket.add(pr);
                }
            }
        }

        return out;
    }

    private static <T> List<List<T>> partition(Collection<T> input, int chunkSize) {
        if (input == null || input.isEmpty()) {
            return List.of();
        }
        if (chunkSize <= 0) {
            throw new IllegalArgumentException("chunkSize must be > 0");
        }
        List<T> list = (input instanceof List<T> l) ? l : new ArrayList<>(input);
        int n = list.size();
        List<List<T>> out = new ArrayList<>((n + chunkSize - 1) / chunkSize);
        for (int i = 0; i < n; i += chunkSize) {
            out.add(list.subList(i, Math.min(n, i + chunkSize)));
        }
        return out;
    }
}

