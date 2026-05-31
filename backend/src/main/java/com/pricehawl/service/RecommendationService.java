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

    public List<RecommendationProductDTO> getRecommendations(UUID userId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        int offset = Math.max(page, 0) * safeSize;
        return recommendationRepository.findRecommendationsByUserId(userId, safeSize, offset);
    }
}
