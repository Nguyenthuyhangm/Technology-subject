package com.pricehawl.dto;

import java.util.UUID;

public record SkinAdviceRequest(
        UUID userId,
        String skinType,
        String sensitivityLevel,
        String acneLevel,
        String mainConcerns,
        String skinGoals,
        String allergies,
        String currentProducts,
        Integer budgetMin,
        Integer budgetMax
) {
}