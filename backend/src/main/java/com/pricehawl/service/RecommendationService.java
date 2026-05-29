package com.pricehawl.service;

import com.pricehawl.dto.RecommendationProductDTO;
import com.pricehawl.entity.SearchHistory;
import com.pricehawl.repository.RecommendationRepository;
import com.pricehawl.repository.SearchHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationRepository recommendationRepository;
    private final SearchHistoryRepository searchHistoryRepository;

    public List<RecommendationProductDTO> getRecommendations(UUID userId) {
        return getRecommendations(userId, 12);
    }

    public List<RecommendationProductDTO> getRecommendations(UUID userId, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 30);

        List<RecommendationProductDTO> wishlistRecommendations =
                recommendationRepository.findRecommendationsByUserId(userId, safeLimit);

        List<SearchHistory> searchHistories =
                searchHistoryRepository.findTop20ByUserIdOrderBySearchedAtDesc(userId.toString());

        List<RecommendationProductDTO> searchRecommendations = new ArrayList<>();

        for (SearchHistory history : searchHistories) {
            if (history.getKeyword() == null || history.getKeyword().isBlank()) {
                continue;
            }

            List<RecommendationProductDTO> products =
                    recommendationRepository.findRecommendationsByKeyword(
                            history.getKeyword().trim(),
                            safeLimit
                    );

            searchRecommendations.addAll(products);
        }

        Map<UUID, RecommendationProductDTO> merged = new LinkedHashMap<>();

        for (RecommendationProductDTO product : wishlistRecommendations) {
            merged.put(product.getId(), product);
        }

        for (RecommendationProductDTO product : searchRecommendations) {
            merged.putIfAbsent(product.getId(), product);
        }

        return merged.values()
                .stream()
                .limit(safeLimit)
                .toList();
    }
}