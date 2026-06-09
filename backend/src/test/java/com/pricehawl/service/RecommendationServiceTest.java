package com.pricehawl.service;

import com.pricehawl.dto.RecommendationProductDTO;
import com.pricehawl.repository.RecommendationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

    @Mock
    private RecommendationRepository recommendationRepository;

    @InjectMocks
    private RecommendationService recommendationService;

    @Test
    void getRecommendations_validPageAndSize() {

        UUID userId = UUID.randomUUID();

        when(recommendationRepository.findRecommendationsByUserId(
                userId,
                10,
                20
        )).thenReturn(List.of());

        recommendationService.getRecommendations(
                userId,
                2,
                10
        );

        verify(recommendationRepository)
                .findRecommendationsByUserId(
                        userId,
                        10,
                        20
                );
    }

    @Test
    void getRecommendations_sizeLessThanOne_shouldUseOne() {

        UUID userId = UUID.randomUUID();

        when(recommendationRepository.findRecommendationsByUserId(
                userId,
                1,
                0
        )).thenReturn(List.of());

        recommendationService.getRecommendations(
                userId,
                0,
                0
        );

        verify(recommendationRepository)
                .findRecommendationsByUserId(
                        userId,
                        1,
                        0
                );
    }

    @Test
    void getRecommendations_sizeGreaterThan50_shouldUse50() {

        UUID userId = UUID.randomUUID();

        when(recommendationRepository.findRecommendationsByUserId(
                userId,
                50,
                0
        )).thenReturn(List.of());

        recommendationService.getRecommendations(
                userId,
                0,
                100
        );

        verify(recommendationRepository)
                .findRecommendationsByUserId(
                        userId,
                        50,
                        0
                );
    }

    @Test
    void getRecommendations_negativePage_shouldUseZero() {

        UUID userId = UUID.randomUUID();

        when(recommendationRepository.findRecommendationsByUserId(
                userId,
                10,
                0
        )).thenReturn(List.of());

        recommendationService.getRecommendations(
                userId,
                -5,
                10
        );

        verify(recommendationRepository)
                .findRecommendationsByUserId(
                        userId,
                        10,
                        0
                );
    }

    @Test
    void getRecommendations_shouldReturnRepositoryResult() {

        UUID userId = UUID.randomUUID();

        RecommendationProductDTO dto =
                mock(RecommendationProductDTO.class);

        List<RecommendationProductDTO> expected =
                List.of(dto);

        when(recommendationRepository.findRecommendationsByUserId(
                userId,
                10,
                0
        )).thenReturn(expected);

        List<RecommendationProductDTO> result =
                recommendationService.getRecommendations(
                        userId,
                        0,
                        10
                );

        assertEquals(1, result.size());
        assertEquals(dto, result.get(0));
    }
}