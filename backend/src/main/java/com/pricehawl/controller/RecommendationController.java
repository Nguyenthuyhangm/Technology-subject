package com.pricehawl.controller;

import com.pricehawl.dto.RecommendationProductDTO;
import com.pricehawl.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/{userId}")
    public List<RecommendationProductDTO> getRecommendations(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "12") int limit
    ) {
        return recommendationService.getRecommendations(userId, limit);
    }
}