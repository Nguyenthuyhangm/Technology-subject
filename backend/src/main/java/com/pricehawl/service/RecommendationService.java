package com.pricehawl.service;

import com.pricehawl.dto.RecommendationProductDTO;
import com.pricehawl.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationRepository recommendationRepository;

    public List<RecommendationProductDTO> getRecommendations(UUID userId) {
        return recommendationRepository.findRecommendationsByUserId(userId, 12);
    }

    public List<RecommendationProductDTO> getRecommendations(UUID userId, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 30);
        return recommendationRepository.findRecommendationsByUserId(userId, safeLimit);
    }
}